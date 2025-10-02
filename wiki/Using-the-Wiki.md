# Using the Wiki

This guide explains how to use and contribute to the WhatsApp Web API documentation.

## Accessing the Wiki

### On GitHub

The wiki documentation is stored in the `wiki/` directory of the repository:
- Browse files: https://github.com/DatGuyRobo/whatsapp-web-docker/tree/main/wiki
- Start here: [wiki/README.md](README.md) or [wiki/Home.md](Home.md)

### GitHub Wiki (Optional)

Repository maintainers can optionally copy these files to GitHub's wiki feature:

1. Enable Wiki in repository settings
2. Clone wiki repository: `git clone https://github.com/DatGuyRobo/whatsapp-web-docker.wiki.git`
3. Copy all files from `wiki/` directory
4. Push to wiki repository

### Local Viewing

Clone the repository and read markdown files locally:

```bash
git clone https://github.com/DatGuyRobo/whatsapp-web-docker.git
cd whatsapp-web-docker/wiki
```

Use any markdown viewer:
- VS Code with Markdown Preview
- Typora
- Obsidian
- Notion
- Or any text editor

### Static Site (Optional)

Convert to static site using tools like:

**MkDocs**:
```bash
pip install mkdocs mkdocs-material
mkdocs serve
```

**Docsify**:
```bash
npm i docsify-cli -g
docsify serve wiki
```

**Jekyll/GitHub Pages**:
Set up GitHub Pages to serve the wiki directory.

## Documentation Structure

```
wiki/
├── README.md                 # Wiki overview and index
├── Home.md                   # Main wiki home page
├── Quick-Start.md            # Getting started quickly
├── Installation.md           # Detailed installation
├── Configuration.md          # Configuration reference
├── Authentication.md         # Authentication guide
├── API-Reference.md          # Complete API docs
├── Webhook-Events.md         # Webhook documentation
├── Database-Schema.md        # Database structure
├── Message-Queue.md          # Queue management
├── Examples.md               # Code examples
├── Security.md               # Security best practices
├── Performance.md            # Optimization guide
├── Migration-Guide.md        # Upgrading from v1.0
├── Troubleshooting.md        # Problem solving
└── FAQ.md                    # Common questions
```

## Navigation

Each page includes:
- Table of contents at the top
- Navigation links at the bottom
- Cross-references throughout

**Bottom navigation format**:
```markdown
[← Previous Page](Previous-Page.md) | [Next Page →](Next-Page.md)
```

## Contributing

### Found an Error?

1. **Small fixes** (typos, formatting):
   - Click "Edit" on GitHub
   - Make changes
   - Submit pull request

2. **Larger changes** (new sections, rewrites):
   - Fork repository
   - Clone locally
   - Edit markdown files
   - Test locally
   - Submit pull request

### Adding New Pages

1. Create new `.md` file in `wiki/` directory
2. Follow existing naming convention: `Title-With-Dashes.md`
3. Include table of contents
4. Add navigation links
5. Update `Home.md` and `README.md` with new page
6. Submit pull request

### Markdown Style Guide

**Headers**:
```markdown
# Page Title (H1 - only one per page)
## Major Section (H2)
### Subsection (H3)
#### Minor Section (H4)
```

**Code blocks**:
````markdown
```bash
# Bash commands
```

```javascript
// JavaScript code
```

```json
{
  "json": "data"
}
```
````

**Links**:
```markdown
[Link Text](Page-Name.md)
[Link to section](Page-Name.md#section-name)
[External link](https://example.com)
```

**Images**:
```markdown
![Alt text](path/to/image.png)
```

**Tables**:
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

**Alerts**:
```markdown
**Note**: Important information

**Warning**: Caution required

**Tip**: Helpful suggestion
```

### Testing Changes

Before submitting:

1. **Preview markdown** - Use VS Code or markdown viewer
2. **Check links** - Ensure all links work
3. **Test code** - Verify code examples work
4. **Check formatting** - Consistent style
5. **Spell check** - Fix typos

## Maintenance

### Regular Updates

Documentation should be updated when:
- New features added
- APIs changed
- Bugs discovered
- User feedback received

### Version Control

- Document version number in `Home.md`
- Update "Last Updated" date
- Maintain changelog if significant changes

### Quality Standards

- **Accurate**: Test all code examples
- **Complete**: Cover all features
- **Clear**: Easy to understand
- **Consistent**: Follow style guide
- **Updated**: Keep current with code

## Getting Help

### For Documentation Issues

- **Unclear instructions**: Open issue describing confusion
- **Missing information**: Request additional documentation
- **Broken links**: Report in issues
- **Outdated content**: Note what needs updating

### For Code Issues

Don't use documentation issues for code problems. Instead:
- Read [Troubleshooting](Troubleshooting.md)
- Check [FAQ](FAQ.md)
- Search existing GitHub issues
- Create new issue with details

## License

Documentation is part of the project and follows the same MIT license.

## Credits

- Original documentation: Repository contributors
- Maintained by: Community
- Based on: whatsapp-web.js documentation

---

**Ready to contribute?** Fork the repo and submit a pull request!

**Found an issue?** Open a GitHub issue with details.

**Need help?** See [Troubleshooting](Troubleshooting.md) or [FAQ](FAQ.md).
