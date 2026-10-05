import { useState } from "react"
import { createFileRoute, notFound } from "@tanstack/react-router"

import type { Media } from "@/schemas/listing"
import { AvatarUpload } from "@/components/app/avatar-upload"
import { CoverUpload } from "@/components/app/cover-upload"
import { Gallery } from "@/components/app/gallery"
import { ImageUploader } from "@/components/app/image-uploader"
import { LogoUpload } from "@/components/app/logo-upload"
import { NotFound } from "@/components/app/not-found"
import { VideoUploader } from "@/components/app/video-uploader"
import { Button } from "@/components/ui/button"

// Development-only demo for step 4.1, so the strings are plain English. Production returns 404. Remove in step 4.7.
export const Route = createFileRoute("/$locale/_public/dev/media")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  notFoundComponent: NotFound,
  component: MediaDemo,
})

const sample = (n: number): Media[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `demo-${i}`,
    type: "image",
    url: `/mock/vehicle-${String((i % 24) + 1).padStart(2, "0")}-{w}.webp`,
    width: 1280,
    height: 853,
    placeholderColor: "#b8c4c0",
    posterUrl: null,
  }))
const video: Media = {
  id: "demo-video",
  type: "video",
  url: "/mock/video-01.mp4",
  width: 1280,
  height: 720,
  placeholderColor: "#aebcb5",
  posterUrl: "/mock/video-01-{w}.webp",
}

function MediaDemo() {
  const [photos, setPhotos] = useState<Media[]>([])
  const [logo, setLogo] = useState<Media | null>(null)
  const [cover, setCover] = useState<Media | null>(null)
  const [avatar, setAvatar] = useState<Media | null>(null)
  const [clip, setClip] = useState<Media | null>(null)
  return (
    <div className="flex flex-col gap-8 py-12">
      <h1 className="text-page font-semibold">Media demo</h1>
      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">ImageUploader, multi</h2>
        <div className="flex gap-2">
          {[0, 1, 20].map((n) => (
            <Button
              key={n}
              variant="secondary"
              onClick={() => setPhotos(sample(n))}
            >
              {n} files
            </Button>
          ))}
        </div>
        <ImageUploader
          mode="multi"
          min={3}
          max={20}
          label="Photos"
          value={photos}
          onChange={setPhotos}
        />
      </section>
      <section className="flex flex-wrap items-start gap-8">
        <LogoUpload label="Logo" value={logo} onChange={setLogo} />
        <AvatarUpload label="Avatar" value={avatar} onChange={setAvatar} />
        <CoverUpload label="Cover" value={cover} onChange={setCover} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-title font-semibold">VideoUploader</h2>
        <VideoUploader label="Video" value={clip} onChange={setClip} />
      </section>
      <section className="flex max-w-3xl flex-col gap-3">
        <h2 className="text-title font-semibold">Gallery</h2>
        <Gallery items={[...sample(5), video]} alt="Toyota Hilux 2019" />
      </section>
    </div>
  )
}
