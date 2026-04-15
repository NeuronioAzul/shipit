# Publishing Guide for VS Code Marketplace

This guide explains how to publish the Image Details extension to the Visual Studio Code Marketplace.

## Prerequisites

Before publishing, ensure you have:

- [x] A Microsoft account (for Azure DevOps)
- [x] Publisher account created on VS Code Marketplace
- [x] Personal Access Token (PAT) from Azure DevOps
- [x] Extension built and packaged (`npm run package`)

## Step 1: Create Publisher Account

1. Visit [Visual Studio Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Create a new publisher:
   - **Publisher ID**: `NeuronioAzul` (must match `package.json`)
   - **Display Name**: Your display name
   - **Description**: Brief description of your publisher profile

## Step 2: Generate Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com/)
2. Click on your profile icon → **Personal access tokens**
3. Click **+ New Token**
4. Configure the token:
   - **Name**: `vsce-publish-token` (or any descriptive name)
   - **Organization**: All accessible organizations
   - **Expiration**: 90 days (or custom)
   - **Scopes**:
     - Select **Custom defined**
     - Check **Marketplace** → **Manage**
5. Click **Create**
6. **IMPORTANT**: Copy the token immediately - you won't be able to see it again!

## Step 3: Authentication Methods

There are two ways to authenticate with the marketplace:

### Method A: Using PAT directly (Recommended for Linux)

If you encounter keyring errors on Linux systems, use the PAT flag directly:

```bash
# Export PAT as environment variable (optional, for convenience)
export VSCE_PAT=your-personal-access-token

# Publish using PAT flag
npx @vscode/vsce publish --no-git-tag-version --pat YOUR_PAT_TOKEN
```

**Note**: Replace `YOUR_PAT_TOKEN` with your actual token. Never commit tokens to git.

### Method B: Using vsce login

```bash
# Login using your publisher name and PAT
npx @vscode/vsce login YourPublisherName

# When prompted, paste your Personal Access Token
```

### Keyring Error Workaround

If you encounter the error `"Object does not exist at path '/org/freedesktop/secrets/collection/login'"`:

```bash
# Set VSCE to use file storage instead of system keyring
export VSCE_STORE=file

# Then publish normally
npx @vscode/vsce publish --no-git-tag-version
```

## Step 4: Pre-Publication Checklist

Before publishing, verify:

- [x] Version updated in `package.json`
- [x] `CHANGELOG.md` updated with new version changes
- [x] `README.md` has screenshots and complete documentation
- [x] All dependencies listed in `package.json`
- [x] Extension tested locally from VSIX
- [x] Production build created (`npm run package`)
- [x] No compilation errors (`npm run compile`)
- [x] Icon file exists (`icon.png` - 128x128px)
- [x] License file exists (`LICENSE`)
- [x] Repository URL correct in `package.json`
- [x] `.vscodeignore` configured properly

## Step 5: Publish to Marketplace

### Recommended Publishing Workflow

This workflow is tested and includes bundling with esbuild:

```bash
# 1. Build optimized bundle
npm run package

# 2. Commit changes
git add -A
git commit -m "chore: release vX.X.X - description"

# 3. Push to GitHub
git push origin main

# 4. Create and push tag
git tag -a vX.X.X -m "vX.X.X - Release description"
git push origin vX.X.X

# 5. Publish to marketplace
npx @vscode/vsce publish --no-git-tag-version --pat YOUR_PAT_TOKEN
```

**Important:**

- Replace `X.X.X` with your actual version number
- Replace `YOUR_PAT_TOKEN` with your Personal Access Token
- The `--no-git-tag-version` flag prevents vsce from auto-bumping version (we manage it manually)

### Alternative: Automatic Version Publishing

```bash
# Publish current version from package.json
npx @vscode/vsce publish --no-git-tag-version

# Or publish with automatic version bump
npx @vscode/vsce publish patch  # 1.0.0 → 1.0.1
npx @vscode/vsce publish minor  # 1.0.0 → 1.1.0
npx @vscode/vsce publish major  # 1.0.0 → 2.0.0
```

### Pre-Release Versions

```bash
# For beta/preview versions
npx @vscode/vsce publish --pre-release
```

## Step 6: Verify Publication

After publishing:

1. Visit your extension page:
   - [Marketplace Extension Page](https://marketplace.visualstudio.com/items?itemName=NeuronioAzul.image-details)

2. Verify the following:
   - Version number is correct
   - Screenshots appear in the Details tab
   - CHANGELOG appears in the Changelog tab
   - Dependencies are listed
   - Badges display correctly
   - Resources links work (Repository, Issues, License)

3. Test installation from marketplace:

   ```bash
   code --install-extension NeuronioAzul.image-details
   ```

## Step 7: Create Git Tag

After successful publication, tag the release:

```bash
git tag -a vX.X.X -m "Release vX.X.X - Description of changes"
git push origin vX.X.X
```

## Step 8: Create GitHub Release (Optional)

1. Go to [GitHub Releases](https://github.com/NeuronioAzul/vscode-ext_img-details/releases)
2. Click **Draft a new release**
3. Configure release:
   - **Tag**: `vX.X.X` (select the tag you just pushed)
   - **Title**: `vX.X.X - Release Title`
   - **Description**: Copy from `CHANGELOG.md`
4. Attach the VSIX file if desired: `image-details-X.X.X.vsix`
5. Click **Publish release**

## Troubleshooting

### Error: "Object does not exist at path '/org/freedesktop/secrets/collection/login'"

This is a Linux keyring error. Solutions:

```bash
# Option 1: Use file storage instead of keyring
export VSCE_STORE=file
npx @vscode/vsce publish --no-git-tag-version

# Option 2: Use PAT flag directly
npx @vscode/vsce publish --no-git-tag-version --pat YOUR_PAT_TOKEN

# Option 3: Install keyring dependencies (if needed)
sudo apt install gnome-keyring libsecret-1-0 libsecret-1-dev
```

### Error: "Publisher not found"

Make sure the publisher ID in `package.json` matches your marketplace publisher:

```json
"publisher": "YourPublisherName"
```

### Error: "Extension vX.X.X already exists"

You're trying to publish a version that already exists. Update the version in `package.json`:

```bash
# Manually update version in package.json, then:
npm run package
git add -A
git commit -m "chore: bump version to vX.X.X"
git push origin main
```

### Error: "Missing repository"

Ensure `package.json` has the repository field:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/YourUsername/your-repo"
}
```

### Error: "Extension validation failed"

Run validation locally to see specific errors:

```bash
npx @vscode/vsce package
```

Check the output for validation errors and fix them before publishing.

### Extension not appearing in search

- Wait 5-10 minutes for indexing
- Check that categories and keywords are set in `package.json`
- Verify extension is not marked as preview-only

## Updating an Existing Extension

To publish an update:

1. Update version in `package.json`
2. Update `CHANGELOG.md` with changes
3. Build optimized bundle: `npm run package`
4. Commit and push changes
5. Create and push git tag
6. Publish: `npx @vscode/vsce publish --no-git-tag-version --pat YOUR_PAT_TOKEN`
7. (Optional) Create GitHub release

## Useful Commands

```bash
# Build optimized production bundle (with esbuild)
npm run package

# Compile TypeScript (development)
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension as VSIX (for local testing)
npx @vscode/vsce package

# List files that will be included in package
npx @vscode/vsce ls

# Show package contents as tree
npx @vscode/vsce ls --tree

# Validate extension without publishing
npx @vscode/vsce package

# Publish with automatic version bump
npx @vscode/vsce publish patch  # 1.0.0 → 1.0.1
npx @vscode/vsce publish minor  # 1.0.0 → 1.1.0
npx @vscode/vsce publish major  # 1.0.0 → 2.0.0
```

## Unpublishing

**WARNING**: Unpublishing is permanent and cannot be undone!

```bash
# Unpublish entire extension (removes all versions)
npx @vscode/vsce unpublish YourPublisherName.extension-name

# Unpublish specific version only
npx @vscode/vsce unpublish YourPublisherName.extension-name@X.X.X
```

## Marketplace Statistics

View download statistics and ratings at the [Publisher Dashboard](https://marketplace.visualstudio.com/manage).

## Additional Resources

- [VS Code Publishing Extensions Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Marketplace Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [vsce CLI Reference](https://github.com/microsoft/vscode-vsce)
- [Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)

---

**Current Project Version**: 1.3.1  
**Last Updated**: March 2026
