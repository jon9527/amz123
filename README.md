<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1t6-UGYL_xF4yumtUhI0rHpuzRC6v-I46

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment (GitHub Pages)

This project is configured to automatically deploy to GitHub Pages using GitHub Actions.

### Setup
1. Push this code to a GitHub repository.
2. Go to your repository **Settings** > **Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. The workflow will automatically trigger on pushes to the `main` or `master` branch.
5. Once the action completes, your site will be live at the URL provided in the Actions tab.

### Manual Build
To build the project locally for verification:
```bash
npm run build
# The output will be in the dist/ folder
```
