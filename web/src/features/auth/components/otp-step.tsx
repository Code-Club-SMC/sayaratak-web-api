import { useEffect, useRef, useState } from "react"

import { FormField } from "@/components/app/form-field"
import { Button } from "@/components/ui/button"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { normalizeDigits } from "@/lib/digits"
import { useT } from "@/lib/i18n/use-t"
import { useCountdown } from "@/lib/use-countdown"
import { useSendOtp, useVerifyOtp } from "../queries"
import { otpFormSchema } from "../schemas"
import { IdentifierSummary } from "./identifier-summary"
import type { StepProps } from "./step-switch"

const COOLDOWN = 30
const MAX_FAILS = 3

export function OtpStep({ state, dispatch, onDone, mode }: StepProps) {
  const { t } = useT()
  const send = useSendOtp()
  const verify = useVerifyOtp()
  const [code, setCode] = useState("")
  const [errorKey, setErrorKey] = useState<string>()
  const [fails, setFails] = useState(0)
  const [resendIn, setResendIn] = useCountdown(COOLDOWN)
  const [lockedFor, setLockedFor] = useCountdown(0)
  const sent = useRef(false)
  const identifier = state.normalizedIdentifier
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    send.mutate({ identifier })
  }, [send, identifier])
  const locked = lockedFor > 0
  const submit = (value: string) => {
    const parsed = otpFormSchema.safeParse({ code: normalizeDigits(value) })
    if (!parsed.success) return setErrorKey(parsed.error.issues[0]?.message)
    verify.mutate(
      { code: parsed.data.code, identifier },
      {
        onSuccess: onDone,
        onError: (e) => {
          setCode("")
          if (e.code !== "otp_invalid")
            return setErrorKey("auth.otp_verify_error")
          setErrorKey("auth.otp_invalid")
          if (fails + 1 >= MAX_FAILS) {
            setFails(0)
            setLockedFor(COOLDOWN)
          } else setFails(fails + 1)
        },
      }
    )
  }
  const resend = () => {
    send.mutate({ identifier })
    setResendIn(COOLDOWN)
    setErrorKey(undefined)
  }
  const error = locked
    ? t("auth.too_many_attempts", { seconds: lockedFor })
    : errorKey
      ? t(errorKey)
      : send.isError
        ? t("auth.otp_send_error")
        : undefined
  return (
    <div className="flex flex-col gap-4">
      <IdentifierSummary
        value={state.identifier}
        onChange={() => dispatch({ type: "back" })}
      />
      <FormField label={t("auth.otp_label")} error={error}>
        {(control) => (
          <div dir="ltr">
            <InputOTP
              {...control}
              maxLength={6}
              value={code}
              onChange={(v) => {
                setCode(normalizeDigits(v))
                setErrorKey(undefined)
              }}
              onComplete={submit}
              autoFocus={mode === "page"}
              autoComplete="one-time-code"
              inputMode="numeric"
              disabled={locked || verify.isPending}
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
        )}
      </FormField>
      <Button
        type="button"
        variant="link"
        className="self-start"
        disabled={resendIn > 0 || send.isPending}
        onClick={resend}
      >
        {resendIn > 0
          ? t("auth.otp_resend_in", { seconds: resendIn })
          : t("auth.otp_resend")}
      </Button>
      <Button
        type="button"
        variant="link"
        className="self-start"
        onClick={() => {
          dispatch({ type: "back" })
          dispatch({ type: "back" })
        }}
      >
        {t("auth.otp_different")}
      </Button>
    </div>
  )
}
