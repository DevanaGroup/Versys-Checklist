# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/e36ee63b-a790-4c02-98f0-a70f51a340eb

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e36ee63b-a790-4c02-98f0-a70f51a340eb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## Image Upload Functionality

This project includes image upload functionality for adequacy reports using **Base64 encoding** to avoid CORS issues.

### Key Features

✅ **No CORS Issues**: Images stored as Base64 in Firestore  
✅ **Simple Setup**: No Firebase Storage configuration needed  
✅ **Universal Compatibility**: Works in any environment  
✅ **Secure**: Only authenticated users can upload  
✅ **Optimized**: 750KB max per image, 5 images max per report  

### How It Works

1. **Upload**: Users select images (max 750KB each)
2. **Convert**: Images are converted to Base64 format
3. **Store**: Base64 data is saved directly in Firestore
4. **Display**: Images are shown from Base64 data with modal viewer

### Documentation

- [BASE64_IMAGES_SOLUTION.md](./BASE64_IMAGES_SOLUTION.md) - Detailed implementation guide
- [FIREBASE_STORAGE_SETUP.md](./FIREBASE_STORAGE_SETUP.md) - Alternative Storage setup (if needed)

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e36ee63b-a790-4c02-98f0-a70f51a340eb) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
