# Smugtools Agent Team

## Overview

This directory contains 5 specialized AI agents designed to work together on the Smugtools project. Each agent has specific responsibilities, tool access, and expertise.

## The Team

### 1. 🎯 Project Captain (`project-captain.md`)
- **Role:** Strategic leader and coordinator
- **Tools:** Full access to everything
- **Focus:** Architecture, roadmap, team coordination

### 2. 🎨 UX Designer (`ux-designer.md`)
- **Role:** User experience and interface design
- **Tools:** Read/Write UI files, web browsing, limited bash
- **Focus:** Beautiful, intuitive interfaces for photographers

### 3. 🔒 Security Guardian (`security-guardian.md`)
- **Role:** Security auditing and protection
- **Tools:** Read files, security scanning, limited write for fixes
- **Focus:** OAuth security, data protection, compliance

### 4. ⚙️ Development Engineer (`development-engineer.md`)
- **Role:** Feature implementation and bug fixes
- **Tools:** Full development access (all files, bash, git)
- **Focus:** Writing code, fixing bugs, optimization

### 5. 📚 Documentation Keeper (`documentation-keeper.md`)
- **Role:** Knowledge management and documentation
- **Tools:** Read/Write docs, search, limited testing
- **Focus:** User guides, API docs, knowledge capture

## How to Use These Agents

### Creating an Agent in Claude

1. Copy the entire content of an agent file (e.g., `project-captain.md`)
2. Use the `/agents` command in Claude
3. Paste the content when prompted
4. The agent will be created with the specified role and tool access

### Example Workflow

```
User: "I need to add a new feature for batch photo uploads"

1. Project Captain - Reviews request, plans architecture
2. UX Designer - Designs the upload interface
3. Development Engineer - Implements the feature
4. Security Guardian - Reviews for vulnerabilities
5. Documentation Keeper - Documents the new feature
```

## Agent Collaboration

Agents are designed to work together:

- **Project Captain** coordinates and assigns tasks
- **UX Designer** and **Development Engineer** pair on features
- **Security Guardian** reviews all code before production
- **Documentation Keeper** captures decisions from everyone

## Technology Context

All agents understand the core integrations:

1. **SmugMug API v2** - Photo management platform
   - OAuth 1.0a authentication
   - 5,000 requests/day rate limit
   - Folders → Galleries → Photos hierarchy

2. **Anthropic Claude AI** - Intelligent features
   - Metadata generation
   - Photo organization
   - Natural language processing

3. **Next.js 14** - Web framework
   - React 18 with Server Components
   - API Routes for backend
   - TypeScript for type safety

## Tool Access Philosophy

Each agent has tools appropriate to their role:

- **Maximum efficiency:** Agents aren't overwhelmed with irrelevant tools
- **Appropriate access:** Security-conscious tool distribution
- **Collaboration-friendly:** Agents can work together without conflicts

## Best Practices

1. **Start with Project Captain** for strategic decisions
2. **Use UX Designer** before implementing UI changes
3. **Have Security Guardian** review before deploying
4. **Let Documentation Keeper** update docs after changes
5. **Development Engineer** handles all code implementation

## Current Project State

- **8+ Production Tools** built and working
- **23+ API Endpoints** implemented
- **OAuth Authentication** fully functional
- **AI Integration** for metadata and organization

### Priority Issues

1. SmugMug PATCH requests failing (nonce_used error)
2. Guest Upload Manager folder creation (400 errors)
3. Token storage needs security upgrade
4. Documentation needs updates

## Questions or Issues?

If an agent needs clarification or encounters issues:

1. Consult the Project Captain for decisions
2. Check CLAUDE.md for development guidelines
3. Review README.md for project overview
4. Ask the Documentation Keeper for knowledge gaps

---

*These agents are designed to accelerate development while maintaining quality, security, and user satisfaction. Use them wisely!*