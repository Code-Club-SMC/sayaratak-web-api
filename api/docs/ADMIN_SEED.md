# Admin-managed dataset

The approved dataset contains 200 listings, 30 businesses and 460 images. It is separate from the development/test database seed. No generated content is installed by exporting prompts.

## Export the image prompts

From the repository root:

```bash
bun run --cwd api seed:prompts /tmp/opencode/sayaratak-image-prompts.json
```

The output path must not exist. Export reads no database, runtime secrets or credentials and works with `bun --no-env-file scripts/seed-prompt-pack.ts <new-path>` from `api/`.

The JSON contains all records, one complete prompt per image, exact accepted filenames and pairing instructions. Generate the first image of each record before the second. Supply the first image to your model as a reference when generating the second.

## Image checklist

- Each pair must depict the same vehicle, component or fictional business. Check model generation, body proportions, color, doors, wheels, lighting and setting.
- Images are fictional. Do not copy a real person's identity, existing business, contact details, registration plates or endorsement.
- Recommended output: 1600×1200, landscape 4:3. Accepted sizes range from 1200×900 to 4096×3072.
- Use JPEG, PNG or WebP, at most 2 MiB per image. Use exactly one listed filename per logical image.
- Return flat ZIPs containing only the requested images. No nested directories or extra files.
- Each ZIP is at most 25 MiB compressed, 100 MiB expanded and 50 images. The dataset requires at least ten batches; split further to meet the byte limits.
- Review every generated image manually. Prompt wording cannot guarantee an accurate or consistent output.

## Availability

Tasks 1 and 2 provide the catalog/export and admin preparation/status boundary. Image intake, storage, installation, removal and browser controls are later tasks; they must not be simulated by successful stub endpoints.

The final public experience requires one small readable bilingual inline notice, disabled synthetic interactions, noindex for seeded detail pages and provenance-based removal preserving real data. No production seed execution or deployment is authorized by this document.
