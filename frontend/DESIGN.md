# Index — Style Reference & Design System Specification
> Blueprint on a backlit drafting table — the entire interface is a wireframe drawing, with one periwinkle annotation pen.

**Theme:** dark (`#000000` base)

Index operates as a technical wireframe drawn in negative space: a near-black canvas wrapped in dashed containment lines, a single muted periwinkle accent (`#7089ba`) used as quiet annotation, and display type set at maximum weight (Raveo 1000 / ultra-bold grotesque) that anchors every section. The visual logic is "blueprint on a light table" — components are not decorated but outlined, so the interface reads as a schematic rather than a finished product. Surfaces stay matte and flat; elevation is implied by hairline dashed borders and a slight surface lift from `#1c1c1c` to `#808080`, never by shadow. The only moment of softness is the hero's radial light wash, which acts like a focused desk lamp on a drafting table. Color is rationed — achromatic 99% of the time, with the violet-blue reserved for small chromatic punctuation (data connection nodes, icon fills, subtle washes). Typography does the emotional heavy lifting: weight 1000 display lines dominate, set tight (`-0.04em`) and large (`70px`) so they feel architectural rather than editorial.

---

## 1. Tokens — Colors

| Name | Hex Value | CSS Token | Role / Semantic Usage |
|------|-----------|-----------|------------------------|
| **Void** | `#000000` | `--color-void` | Page background, all structural borders, primary canvas — absolute black that makes dashed containment lines read as ink on drafting paper |
| **Carbon** | `#1c1c1c` | `--color-carbon` | Elevated surface — card backgrounds, section fills, hero spotlight wash; lifted one step from Void |
| **Graphite** | `#4d4d4d` | `--color-graphite` | Tertiary borders and disabled outlines, dividers in dense lists |
| **Steel** | `#808080` | `--color-steel` | Body text secondary, metadata labels, muted borders, checkbox/divider lines on dark |
| **Ash** | `#ababab` | `--color-ash` | Helper text, caption-level metadata, tertiary text on dark surfaces |
| **Paper** | `#ffffff` | `--color-paper` | Primary text, logo mark, active nav text, button borders, eyebrow chips — the bright stroke against void |
| **Periwinkle Annotation** | `#7089ba` | `--color-periwinkle-annotation` | Decorative icon fills, CAD illustration strokes, data-node accents, subtle highlight washes, checkmark accents — the single chromatic mark |

---

## 2. Tokens — Typography

### Font Families
- **Display & Headings:** `Raveo Variable` (Fallbacks: `Plus Jakarta Sans`, `Inter`, `Manrope`, system-ui)
  - Ultra-weight 1000 at 70px display (`letter-spacing: -0.04em`, `line-height: 1.10`)
  - Weight 500 for subheadings and buttons
  - Weight 400 for descriptive body
- **Technical Monospace:** `Geist Mono` (Fallback: `JetBrains Mono Variable`, monospace)
  - Weight 500 for eyebrow chips, version tags (`"NEW · INDEX 2.0 EARLY PREVIEW"`), step indicators, and CAD micro-labels
  - Tracked `+0.02em` for legibility at small sizes

### Type Scale

| Role | Font Size | Line Height | Letter Spacing | CSS Token |
|------|-----------|-------------|----------------|-----------|
| **micro** | 9px | 1.60 | +0.02em | `--text-micro` |
| **caption** | 12px | 1.20 | 0.00em | `--text-caption` |
| **body-sm** | 14px | 1.60 | -0.14px | `--text-body-sm` |
| **body** | 16px | 1.60 | -0.16px | `--text-body` |
| **subheading** | 24px | 1.40 | -0.24px | `--text-subheading` |
| **heading** | 32px | 1.20 | -0.32px | `--text-heading` |
| **display** | 70px | 1.10 | -2.80px (-0.04em) | `--text-display` |

---

## 3. Spacing & Shapes

- **Density:** Compact
- **Page Max Width:** `1200px`
- **Section Gap:** `80px`
- **Card Padding:** `24px` / `48px`
- **Element Gap:** `10px` / `16px` / `24px`

### Border Radii
- `nav`: `6px` (`--radius-nav`)
- `featureTiles`: `20px` (`--radius-featuretiles`)
- `iconContainers`: `50px` (`--radius-iconcontainers`)
- `tags` / `eyebrows`: `100px` (`--radius-tags`)
- `buttons`: `100px` (`--radius-buttons` — fully pill)
