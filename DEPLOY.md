# Deploying EmojiWorld to Vercel

This guide will help you deploy EmojiWorld to Vercel for free hosting.

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free)
- Your EmojiWorld repository pushed to GitHub

## Method 1: Deploy via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the configuration
5. Click "Deploy"
6. Wait for the build to complete
7. Your app will be live at `https://your-project.vercel.app`

## Method 2: Deploy via Vercel CLI

1. Install Vercel CLI globally:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from your project directory:
```bash
cd emojiworld
vercel
```

4. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? (select your account)
   - Link to existing project? **N**
   - What's your project's name? **emojiworld** (or your preferred name)
   - In which directory is your code located? **./**
   - Want to override the settings? **N**

5. Your app will be deployed! Vercel will provide you with a URL.

## Method 3: Deploy to Production

After your first deployment, you can deploy to production:

```bash
vercel --prod
```

## Configuration

The `vercel.json` file in the project root contains all necessary configuration:

- **API Routes**: Serverless functions for the simulation backend
- **Static Files**: Public HTML, CSS, and JavaScript files
- **Build Command**: Automatically compiles TypeScript

## Environment Variables

No environment variables are required for basic deployment. The simulation uses in-memory storage.

For production use with persistent state, you might want to add:
- Redis connection string (for persistent world state)
- Custom configuration overrides

## Custom Domain

To add a custom domain:

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your domain
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails

If the build fails, check:
- All dependencies are in `package.json`
- TypeScript compiles locally with `npm run build`
- No syntax errors in your code

### API Not Working

If the API endpoints return errors:
- Check the Vercel function logs in your dashboard
- Ensure the `dist` folder is built during deployment
- Verify CORS settings if accessing from a different domain

### Performance Issues

For better performance:
- Consider using Redis for world state (Vercel KV)
- Implement session cleanup for inactive worlds
- Add rate limiting to API endpoints

## Monitoring

Monitor your deployment:
- View logs in Vercel Dashboard
- Check analytics for usage statistics
- Set up alerts for errors

## Updating Your Deployment

Vercel automatically redeploys when you push to your main branch. For manual updates:

```bash
git push origin main
# Vercel will auto-deploy
```

Or use CLI:
```bash
vercel --prod
```

## Support

For issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Visit [Vercel Community](https://github.com/vercel/vercel/discussions)
- Open an issue in the EmojiWorld repository
