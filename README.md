**Demo:** https://character-creator-window.vercel.app/

**Notes:**
* This fork adds a feature where you can generate an avatar based on your description
using an LLM via [Window AI](https://windowai.io/).
* Currently, the LLM only understands color for eyes and head (which includes hair), because for the other traits
(body, chest, feet, legs, and outer) the color is not in the metadata. There could
be a way to automatically parse the color from the images in the [@webaverse-studios/character-assets](https://github.com/webaverse-studios/character-assets) repo.

---

# Webaverse Character Studio
An open, collaborative and evolving 3D avatar studio for the open metaverse.

# Quick Start
```bash
# Clone the repo and change directory into it
git clone https://github.com/webaverse-studios/CharacterCreator
cd CharacterCreator

# Install dependencies with legacy peer deps flag to ignore React errors
npm install --legacy-peer-deps
npm run dev

# Or use yarn
yarn install
yarn run dev
```
