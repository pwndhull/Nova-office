# NOVA-OFFICE

## Open-source LibreOffice-based modern productivity suite

You are the lead software architect, senior C++ engineer, UI/UX engineer, build/release engineer, and open-source compliance engineer.

Your task is to build a new open-source productivity suite called:

# Nova-Office

Nova-Office should be based on the LibreOffice open-source codebase, while becoming a substantially redesigned, modern productivity platform.

The goal is to create a serious alternative to:

* Microsoft 365
* Apple iWork
* Notion
* Google Workspace

The product must prioritize:

1. Excellent offline functionality
2. Modern Apple-quality UX
3. Notion-like simplicity and organization
4. Microsoft Office-level document compatibility
5. Real-time online collaboration when connected
6. Seamless offline → online synchronization
7. Cross-platform architecture
8. Extensibility
9. Open-source compliance
10. Rebrandability

---

# 1. FIRST: DO NOT START CODING IMMEDIATELY

Before modifying anything:

## Repository investigation

Analyze the entire LibreOffice repository.

Determine:

* repository structure
* build system
* major applications
* Writer architecture
* Calc architecture
* Impress architecture
* Draw architecture
* Base architecture
* UNO architecture
* VCL
* SFX
* framework modules
* document model
* import/export filters
* extension system
* localization
* accessibility
* platform-specific code
* existing collaboration functionality
* networking-related code
* plugin/extension architecture
* existing UI architecture
* build dependencies
* test infrastructure
* packaging infrastructure

Create:

/docs/architecture-analysis.md

containing your findings.

DO NOT modify large portions of LibreOffice until you understand the existing architecture.

---

# 2. LICENSE REQUIREMENTS

LibreOffice is open source.

Before implementation:

Identify the exact licenses of:

* LibreOffice
* every third-party dependency
* every dependency we introduce
* collaboration libraries
* synchronization libraries
* cryptography libraries
* networking libraries
* UI libraries

Create:

/docs/licensing.md

The project must remain legally compliant with the licenses of all upstream components.

Do NOT:

* remove required copyright notices
* remove license notices
* falsely claim LibreOffice code was written entirely by Nova-Office
* copy proprietary Apple, Microsoft, Notion or Google assets
* copy proprietary source code from competitors

Nova-Office branding and original UI/UX should be our own.

Maintain appropriate upstream attribution.

---

# 3. PRODUCT VISION

Nova-Office should feel like a modern operating-system-native productivity suite.

The product family should eventually contain:

## Nova Writer

Word processor.

## Nova Sheets

Spreadsheet application.

## Nova Slides

Presentation application.

## Nova Draw

Vector/diagram application.

## Nova Database

Database application.

## Nova Notes

A new Notion-inspired knowledge/document workspace.

## Nova Hub

Unified application launcher, files, recent documents, templates, collaboration and account management.

---

# 4. DESIGN PHILOSOPHY

The interface should combine design principles inspired by:

### Apple

* clean
* spacious
* minimal
* native-feeling
* excellent typography
* subtle animations
* keyboard shortcuts
* contextual controls
* focus on content

### Notion

* block-based organization
* slash commands
* nested pages
* backlinks
* databases
* properties
* flexible workspace
* command palette

### Microsoft Office

* powerful editing
* professional document tooling
* compatibility
* familiar productivity workflows
* advanced formatting
* spreadsheet functionality
* presentation functionality

DO NOT directly clone proprietary interfaces.

Create an original Nova-Office design language.

---

# 5. NOVA DESIGN SYSTEM

Create a centralized design system.

Create documentation:

/docs/design-system.md

Define:

* colors
* typography
* spacing
* radii
* shadows
* icons
* buttons
* menus
* toolbars
* sidebars
* sheets
* dialogs
* command palette
* tabs
* document navigation
* comments
* collaboration indicators
* presence indicators
* notifications
* empty states
* loading states
* error states
* accessibility states
* dark mode
* light mode
* high contrast mode

The design system must be token-based.

Avoid hardcoding visual values throughout the application.

---

# 6. APPLICATION SHELL

Build a unified Nova shell.

Conceptually:

+------------------------------------------------------+
| Nova logo | File | Edit | View | Insert | ...       |
+------------------------------------------------------+
| Contextual toolbar                                  |
+----------+-------------------------------------------+
|          |                                           |
| Sidebar  |                Document                   |
|          |                                           |
| Files    |                                           |
| Pages    |                                           |
| Outline  |                                           |
| Comments |                                           |
|          |                                           |
+----------+-------------------------------------------+
| Status / collaboration / sync / document state      |
+------------------------------------------------------+

The shell should support:

* sidebar
* command palette
* global search
* document tabs
* recent files
* pinned files
* workspace navigation
* account state
* sync state
* collaboration state
* offline state
* notifications

---

# 7. COMMAND PALETTE

Create a universal command palette.

Shortcut:

Cmd/Ctrl + K

It should allow:

* open document
* create document
* switch application
* search document
* search workspace
* run formatting commands
* insert elements
* navigate pages
* manage comments
* share document
* toggle sidebar
* change theme
* access settings

Design it as a first-class Nova component.

---

# 8. OFFLINE-FIRST ARCHITECTURE

This is one of the most important requirements.

Nova-Office MUST work completely offline.

Users must be able to:

* create documents
* open documents
* edit documents
* save documents
* format documents
* create spreadsheets
* create presentations
* use formulas
* print
* export
* import supported formats
* search local documents
* use Nova Notes
* manage local workspaces

without an internet connection.

Never make the core editing experience dependent on a server.

---

# 9. LOCAL DATA ARCHITECTURE

Design an offline-first local storage architecture.

Recommended conceptual architecture:

Application
↓
Nova Document Layer
↓
Local Workspace
↓
Document Store
↓
Filesystem / local database

Use appropriate technologies based on the existing LibreOffice architecture.

Do not introduce unnecessary databases if the existing document storage system is better suited.

For Nova-specific metadata, consider a local database such as SQLite where appropriate.

Store:

* documents
* workspace metadata
* pages
* document relationships
* comments
* collaboration metadata
* sync state
* conflict metadata
* search indexes
* user preferences

---

# 10. DOCUMENT COMPATIBILITY

Preserve LibreOffice's strong support for:

* ODT
* ODS
* ODP
* DOC
* DOCX
* XLS
* XLSX
* PPT
* PPTX
* PDF
* CSV
* TXT
* HTML

Do not break existing import/export filters unless there is a compelling architectural reason.

Create compatibility tests.

The goal is:

"Modern UX without sacrificing Office compatibility."

---

# 11. NOVA NOTES

Create a new application/workspace inspired by modern knowledge-management applications.

Nova Notes should support:

* pages
* nested pages
* blocks
* headings
* paragraphs
* lists
* checkboxes
* tables
* code blocks
* callouts
* images
* files
* links
* embeds
* backlinks
* page properties
* tags
* databases
* templates
* slash commands

Example:

/heading
/text
/table
/todo
/image
/code
/callout

Use an architecture that can coexist with LibreOffice document formats.

Do not force the existing Writer document model to become a block editor if that would create an unstable architecture.

Create a clean Nova Notes document model where appropriate.

---

# 12. UNIFIED WORKSPACE

Users should be able to organize:

Workspace
├── Documents
├── Spreadsheets
├── Presentations
├── Notes
├── Databases
├── Templates
└── Shared

Allow:

* folders
* tags
* favorites
* recent
* pinned
* search
* sorting
* filtering

---

# 13. ONLINE COLLABORATION

Build collaboration as an OPTIONAL online layer.

Core editing must remain functional without it.

When online, support:

* document sharing
* multiple users
* presence
* comments
* mentions
* collaborative editing
* document locking where appropriate
* version history
* activity history
* permissions

Architecture:

Nova Client
|
v
Collaboration Layer
|
+---- Authentication
|
+---- Presence
|
+---- Document Sync
|
+---- Comments
|
+---- Version History
|
v
Storage

Do not tightly couple the LibreOffice editing engine to a specific commercial cloud provider.

Create provider abstractions.

---

# 14. SYNCHRONIZATION

Implement offline-first synchronization.

Example:

User edits document offline
↓
Local document changes
↓
Local change queue
↓
Internet becomes available
↓
Sync engine
↓
Remote document
↓
Conflict detection
↓
Merge / conflict resolution
↓
Updated local document

Requirements:

* resumable sync
* retry
* exponential backoff
* change queue
* conflict detection
* conflict resolution
* integrity checking
* encrypted transport
* version tracking

Never silently overwrite user data.

---

# 15. COLLABORATION PROTOCOL

Design a provider-neutral collaboration protocol.

Possible concepts:

Document ID
Version
Revision
Operation
Actor
Timestamp
Checksum

Research whether an existing CRDT/OT technology can safely integrate with the document model.

Do NOT automatically choose a CRDT just because it is popular.

Evaluate:

* Yjs
* Automerge
* Automerge Repo
* custom OT
* LibreOffice collaboration mechanisms
* other mature open-source synchronization technologies

Create:

/docs/collaboration-evaluation.md

Explain the decision.

---

# 16. SERVER ARCHITECTURE

Create a reference collaboration backend.

Prefer a modular architecture.

Possible stack:

API
Authentication
WebSocket collaboration
Sync service
Object storage
Metadata database
Search
Notifications

The backend should be deployable independently.

Do not require Nova-Office users to use our hosted service.

Eventually users should be able to self-host.

---

# 17. SELF-HOSTING

Design Nova Cloud as an optional component.

A future user should be able to run:

Nova-Office
+
Nova Server

on their own infrastructure.

Support conceptual deployment:

Docker
Linux
VPS
NAS
Private server
Cloud

Document the API boundaries.

---

# 18. SECURITY

Implement security as a core requirement.

Requirements:

* TLS
* secure authentication
* secure sessions
* permission checks
* document authorization
* encryption in transit
* optional encryption at rest
* secure token storage
* local credential protection
* secure synchronization
* input validation
* dependency vulnerability monitoring

Do not invent cryptography.

Use established libraries.

---

# 19. PRIVACY

Nova-Office should be privacy-first.

Offline documents must NOT require cloud connectivity.

Telemetry should be:

* disabled by default OR
* clearly opt-in

No unnecessary document contents should be sent to servers.

Create:

/docs/privacy.md

---

# 20. AI ARCHITECTURE

Do NOT make AI mandatory.

Create an optional AI abstraction layer.

Support:

Local AI
Cloud AI
Self-hosted AI

Conceptually:

Nova AI API
|
+--- Local model
|
+--- OpenAI-compatible endpoint
|
+--- Ollama
|
+--- Other provider
|
+--- Disabled

AI features could eventually include:

* rewrite
* summarize
* grammar
* spreadsheet assistance
* presentation generation
* document search
* semantic search
* local document Q&A

The user should be able to disable AI completely.

---

# 21. CROSS PLATFORM

Prioritize:

1. macOS
2. Windows
3. Linux

Architecture should allow future:

* iPadOS
* iOS
* Android
* Web

Do not destroy platform-native behavior in pursuit of one identical interface.

---

# 22. MACOS EXPERIENCE

Because Apple-quality UX is an important goal:

Implement proper macOS behavior where possible:

* native menu integration
* keyboard shortcuts
* command handling
* system appearance
* dark mode
* accessibility
* window management
* full-screen
* document icons
* file dialogs
* drag and drop
* Services integration where appropriate

Do not simply create a web page inside a desktop wrapper.

---

# 23. WINDOWS EXPERIENCE

Preserve proper Windows behavior:

* native shortcuts
* file dialogs
* Windows conventions
* accessibility
* system theme
* high DPI
* window management

---

# 24. LINUX EXPERIENCE

Support major Linux desktop environments.

Do not introduce unnecessary proprietary dependencies.

---

# 25. DOCUMENT TABS

Create a modern tab system.

Users should be able to have:

Document A | Document B | Spreadsheet | Notes

Tabs should support:

* close
* reorder
* duplicate
* pin
* restore
* drag/drop

---

# 26. FILE BROWSER

Create a modern file browser.

Features:

* grid view
* list view
* folders
* search
* tags
* recent
* favorites
* file type filters
* sorting
* previews
* context menu
* drag and drop

---

# 27. SEARCH

Create unified search.

Search across:

* documents
* notes
* spreadsheets
* presentations
* filenames
* content
* tags
* metadata

Support offline local search.

Do not require a cloud search service.

---

# 28. COMMENTS

Create modern comments.

Support:

* comments
* replies
* mentions
* resolve
* reopen
* timestamps
* author
* document location

Comments must work offline locally.

They can synchronize when online.

---

# 29. VERSION HISTORY

Support local version history.

When online, optionally synchronize versions.

Users should be able to:

* view versions
* compare versions
* restore versions
* label versions

Do not require cloud storage for basic local history.

---

# 30. THEMES

Implement:

* Light
* Dark
* System
* High Contrast

Create a centralized theme/token architecture.

---

# 31. ACCESSIBILITY

Accessibility is mandatory.

Support:

* keyboard navigation
* screen readers
* high contrast
* focus states
* reduced motion
* scalable text
* accessible labels
* semantic controls

Do not treat accessibility as a final-stage feature.

---

# 32. PERFORMANCE

Nova-Office must remain performant.

Do not introduce a heavy JavaScript/web runtime into every editing surface unless there is a strong technical reason.

Avoid:

* unnecessary background processes
* excessive memory usage
* duplicate document models
* unnecessary synchronization
* unnecessary polling

Measure:

* startup time
* memory
* CPU
* document load time
* save time
* search time
* sync time

Create benchmarks.

---

# 33. ARCHITECTURAL PRINCIPLE

Separate:

CORE OFFICE ENGINE

from

NOVA EXPERIENCE LAYER

Conceptually:

+------------------------------------------------+
|                  Nova UI                       |
+------------------------------------------------+
|           Nova Application Layer               |
+------------------------------------------------+
|       Collaboration / Sync / Workspace         |
+------------------------------------------------+
|         Nova Document Abstraction              |
+------------------------------------------------+
|              LibreOffice Core                  |
+------------------------------------------------+
|               OS / Filesystem                  |
+------------------------------------------------+

Avoid invasive modifications to LibreOffice core whenever possible.

Prefer:

* adapters
* services
* interfaces
* extensions
* reusable components
* clean abstraction layers

This will make future LibreOffice upstream updates easier.

---

# 34. BRANDING

Product name:

Nova-Office

Brand family:

Nova Writer
Nova Sheets
Nova Slides
Nova Notes
Nova Draw
Nova Database
Nova Hub

Create a branding abstraction so another organization could rebrand the application.

Do not hardcode Nova branding throughout source files.

Centralize:

* application name
* logos
* icons
* URLs
* product metadata
* update server
* cloud endpoints
* support URLs

---

# 35. REBRANDING ARCHITECTURE

Create a configuration layer:

product/
product.yaml
branding/
icons/
localization/

Example conceptual configuration:

product_name: Nova-Office
writer_name: Nova Writer
sheets_name: Nova Sheets
slides_name: Nova Slides

The actual implementation can use a more appropriate format if required by the platform.

Goal:

A future developer should be able to fork Nova-Office and replace the branding without manually modifying hundreds of files.

---

# 36. EXTENSION SYSTEM

Preserve and improve extensibility.

Create a documented plugin model.

Potential plugin categories:

* document tools
* themes
* exporters
* importers
* AI providers
* collaboration providers
* cloud providers
* productivity tools

Security should be considered before allowing plugins to execute arbitrary code.

---

# 37. TESTING

Create tests for:

Unit
Integration
Document compatibility
Synchronization
Conflict resolution
Offline operation
UI
Accessibility
Security
Performance

Create automated tests for:

Offline editing
Offline save
Reconnect
Sync
Conflict
Large documents
Large spreadsheets
Presentation rendering
DOCX import/export
XLSX import/export
PPTX import/export
PDF export

---

# 38. BUILD SYSTEM

First understand the existing LibreOffice build system.

Do not replace it blindly.

Create reproducible developer instructions.

Documentation:

/docs/build-macos.md
/docs/build-windows.md
/docs/build-linux.md
/docs/development.md

---

# 39. DEVELOPMENT PHASES

Do NOT attempt to build the entire product in one giant change.

Use phases.

## PHASE 0 — Investigation

Analyze repository.

Deliver:

* architecture document
* dependency map
* license analysis
* UI analysis
* collaboration analysis
* proposed architecture

Do not make destructive changes.

---

## PHASE 1 — Nova Shell

Create:

* branding
* application shell
* navigation
* sidebar
* command palette
* theme system
* document tabs
* file browser

Use existing LibreOffice functionality underneath.

---

## PHASE 2 — Nova Writer

Modernize Writer experience.

Preserve Writer's underlying functionality.

---

## PHASE 3 — Nova Sheets

Modernize Calc experience.

---

## PHASE 4 — Nova Slides

Modernize Impress experience.

---

## PHASE 5 — Nova Notes

Implement the new block/page-based workspace.

---

## PHASE 6 — Unified Workspace

Integrate:

* files
* notes
* documents
* search
* templates
* tags
* favorites

---

## PHASE 7 — Offline Infrastructure

Implement:

* local metadata
* local search
* local versioning
* offline queues
* sync state

---

## PHASE 8 — Collaboration

Implement:

* presence
* comments
* document sharing
* collaborative editing
* synchronization
* conflict resolution

---

## PHASE 9 — Nova Server

Create self-hostable backend.

---

## PHASE 10 — Packaging

Build:

macOS
Windows
Linux

packages.

---

# 40. GIT STRATEGY

DO NOT make one enormous commit.

Use logical commits.

Examples:

feat(shell): create Nova application shell

feat(theme): add Nova design tokens

feat(writer): add Nova Writer navigation

feat(notes): introduce Nova Notes document model

feat(sync): add offline change queue

feat(collaboration): add presence service

docs(architecture): document collaboration architecture

fix(sync): resolve revision conflict

Keep commits understandable.

---

# 41. UPSTREAM STRATEGY

Track LibreOffice upstream separately.

Create documentation explaining:

* upstream branch
* Nova branch
* patches
* custom modules
* upstream merge strategy

Avoid modifying upstream code when a Nova-specific layer is possible.

The long-term goal is to make LibreOffice updates manageable.

---

# 42. DOCUMENTATION

Create:

/docs/

architecture.md
architecture-analysis.md
design-system.md
licensing.md
privacy.md
security.md
collaboration-evaluation.md
collaboration.md
sync.md
offline.md
plugin-system.md
build-macos.md
build-windows.md
build-linux.md
development.md
contributing.md
rebranding.md
roadmap.md

---

# 43. ENGINEERING RULES

Follow these rules throughout the project:

1. Do not guess about LibreOffice internals.
2. Inspect source before modifying it.
3. Reuse existing functionality whenever possible.
4. Avoid unnecessary rewrites.
5. Prefer modular architecture.
6. Keep Nova-specific code separated.
7. Keep upstream integration maintainable.
8. Write tests for important behavior.
9. Do not break existing document compatibility.
10. Never sacrifice offline functionality for cloud functionality.
11. Never silently overwrite user documents.
12. Never introduce proprietary dependencies without documenting them.
13. Never copy proprietary competitor code/assets.
14. Keep licensing compliant.
15. Document architectural decisions.

---

# 44. CLAUDE CODE WORKFLOW

When you start:

STEP 1
Inspect repository.

STEP 2
Identify current branch and git status.

STEP 3
Identify LibreOffice version/commit.

STEP 4
Generate architecture analysis.

STEP 5
Generate proposed Nova architecture.

STEP 6
Show me the implementation plan.

DO NOT start large-scale implementation until the architecture analysis and implementation plan are complete.

After approval:

Implement one phase at a time.

After every major phase:

* compile
* run tests
* inspect errors
* fix errors
* update documentation
* create git commit

Never leave the repository knowingly broken.

---

# 45. IMPORTANT: DO NOT FAKE IMPLEMENTATION

Do not create fake UI screens that merely look like Nova-Office.

The objective is a REAL application.

Do not:

* create static mockups
* create fake collaboration
* create fake sync
* create fake offline mode
* create placeholder implementations while claiming completion

If a feature cannot yet be implemented, explicitly mark it:

TODO
NOT IMPLEMENTED
EXPERIMENTAL

and document what remains.

---

# 46. PRIORITY ORDER

When technical trade-offs occur, prioritize:

1. Data integrity
2. Offline functionality
3. Document compatibility
4. Stability
5. Security
6. Performance
7. Accessibility
8. Collaboration
9. UI polish
10. Experimental features

---

# 47. DEFINITION OF DONE

Nova-Office should eventually provide:

### Desktop

macOS
Windows
Linux

### Office

Writer
Sheets
Slides
Draw
Database

### Knowledge

Notes
Pages
Blocks
Databases
Backlinks

### Offline

100% core editing functionality without internet.

### Online

Sync
Sharing
Comments
Presence
Collaboration
Version history

### Compatibility

DOCX
XLSX
PPTX
ODT
ODS
ODP
PDF
and other LibreOffice-supported formats.

### UX

Apple-quality simplicity
+
Notion-style organization
+
Microsoft-level productivity

### Architecture

Open source
Self-hostable
Provider-neutral
Rebrandable
Modular
Maintainable

---

# 48. START NOW

Begin with PHASE 0 only.

Do NOT start rewriting the UI.

First inspect the complete repository and produce:

1. Repository architecture
2. LibreOffice module map
3. Current UI architecture
4. Document architecture
5. Collaboration possibilities
6. Offline architecture
7. Build architecture
8. Dependency map
9. Licensing map
10. Recommended Nova architecture
11. Proposed directory structure
12. Phase-by-phase implementation plan
13. Major technical risks
14. Estimated complexity of each subsystem

Then present a concise:

# NOVA-OFFICE MASTER IMPLEMENTATION PLAN

Do not proceed beyond Phase 0 until the plan is technically justified.
