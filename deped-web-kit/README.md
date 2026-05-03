# DepED Web Kit

`DepED-Web-Kit` is a workspace app inside the DepED USIS monorepo that serves as a visual and front-end branding reference for future DepEd-aligned modules.

## Purpose

- capture the official DepEd palette from the visual identity guide
- reflect the clean, institutional style seen in DepEd web portals such as LIS
- provide reusable layout and UI direction for future USIS apps

## Information Architecture

`DepED-Web-Kit` follows a documentation-portal structure rather than a marketing landing page.

Required pillars:

- `Overview`
- `Foundations`
- `Forms`
- `Patterns`

The app should remain organized around these four guidance areas.

## Visual Consistency Rules

- use flat color surfaces only
- do not use ombre, gradients, or decorative visual effects
- keep similar box-style surfaces on a `10px` corner radius
- when migrating or rebranding other USIS modules, apply this same box component treatment to cards, panels, summaries, and comparable content surfaces
- use Helvetica for web interface text inside the kit
- do not present Helvetica as a replacement for official DepEd logo typography
- keep the official DepEd logo asset and favicon proportional and unstretched

Box-style surfaces that should follow the `10px` radius rule include:

- pillar cards
- color token cards
- typography cards
- tone and guidance cards
- form cards and catalog panels
- portal preview panels and similar reference containers

## Typography Rule

The official DepEd identity has its own typography guidance in the visual identity manual.

For the web kit:

- Helvetica is the interface typography standard
- official DepEd mark typography must remain distinct from the web-kit interface font rule
- use the shared USIS type scale by default: titles up to `24px`, regular text up to `16px`, and subtitles, labels, and helper text up to `13px`
- do not exceed those sizes unless a maintainer explicitly requests a larger treatment for a specific screen

## Layout Direction

- use a documentation-style shell with utility header, masthead, search, section navigation, breadcrumbs, and page introductions
- preserve generous padding around the header, navigation, intros, and content sections
- keep copy direct, technical, and institutional
- prefer web-ready tokens and reusable patterns over one-off styling decisions

## Styling Stack

- use Tailwind CSS with PostCSS for shared layout, shell, and documentation component styling
- keep Tailwind utility usage aligned with DepED-Web-Kit tokens instead of ad hoc values where a token already exists
- retain focused custom CSS only for interactive widgets that still need controlled behavior, such as floating inputs, custom searchable selects, modal previews, and similar form demonstrations
- when migrating a legacy component, prefer an incremental Tailwind conversion over a full visual rewrite

## Keyboard Flow

- DepEd USIS forms should support fast keyboard-only navigation
- define explicit tab order for clerical and high-volume form workflows when field order must be predictable
- the `Floating input family` sample in this kit is the reference for explicit tab-index handling

## Run

From the monorepo root:

```powershell
npm run dev:deped-web-kit
```

## Public AI Reference

After deployment, this app exposes a single AI-readable reference file at:

```text
/usis-ai-reference.txt
```

Example deployed URL:

```text
https://your-deployed-web-kit-domain/usis-ai-reference.txt
```

Use that direct file URL when you want another AI agent to follow the published DepED-Web-Kit rules without depending on a full site crawl.

Maintenance rule:

- whenever DepED-Web-Kit components, patterns, rules, or implementation standards change, update `public/usis-ai-reference.txt` in the same change set
- do not let the deployed AI reference drift behind the current web-kit documentation or behavior

## Notes

- colors are based on the DepEd visual guide PDF provided for this project
- the app is structured by feature relevance to follow the repo `AGENTS.md` architecture rule
- the app also acts as the recorded visual baseline for future USIS-facing web modules
