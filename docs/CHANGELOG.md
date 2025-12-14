# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Obsidian-native internal links using heading text (`[[#Heading|text]]`)
- Native footnote support (`[^id]` syntax)
- Anchor preprocessing to hoist IDs onto headings
- Pre-indexing of heading text for accurate link resolution

### Changed
- Internal links now use heading text instead of Block IDs
- Image output includes explicit spacing (`\n\n`) to prevent merging

### Fixed
- Images no longer merge with subsequent headings
- Footnote back-links properly removed from definitions

## [1.1.1] - 2025-12-15

### Added
- Comprehensive integration test suite
- Dynamic EPUB generation for testing

### Changed
- Modularized `Converter.js` into smaller internal methods
- Improved link rewriting logic

### Fixed
- Broken internal links due to invalid HTML nesting
- Image extraction collision handling

## [1.0.0] - Initial Release

### Added
- EPUB to Markdown conversion
- Obsidian-optimized output (ATX headers, fenced code blocks)
- Image extraction to `assets/` folder
- YAML frontmatter generation
- Progress bar for conversion
