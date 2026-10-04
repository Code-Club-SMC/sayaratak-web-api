import { userSchema } from "@/schemas/user"

import { route } from "../http"

route("GET", "/me", ({ user }) => (user ? userSchema.parse(user) : null))
