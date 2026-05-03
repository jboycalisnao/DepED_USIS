# USIS Shared CSS Library

This folder contains reusable CSS formatting primitives derived from `deped-web-kit/`.

Use `common/css/index.css` when a subsystem should import the full shared formatting set. Individual files may be imported when a subsystem only needs one family of styles.

## Files

- `tokens.css` - DepED USIS color, spacing, radius, font, and type-scale tokens
- `base.css` - document reset and base typography
- `layout.css` - content width, page frame, page intro, and section layout
- `header.css` - Web-Kit header, search, and navigation treatment
- `footer.css` - USIS global footer structure
- `boxes.css` - cards, panels, notices, and modal box treatment
- `forms.css` - floating fields, form grids, actions, and buttons
- `utilities.css` - screen-reader utility, status badges, and table formatting

## Standards

- Box-style content surfaces use `10px` radius through `--usis-radius-surface`.
- Buttons, form controls, and narrow utility controls use `10px` radius through `--usis-radius-control`.
- Titles use `24px`, body text uses `16px`, and labels/helper text use `13px` unless a maintainer approves an exception.
- Colors are restricted to DepED Blue, DepED Red, DepED Yellow, white, and restrained institutional ink/muted tones.
