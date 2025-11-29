# 🚀 Quick Start Guide

Get the demo app running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

For iOS (macOS only):

```bash
cd ios && bundle exec pod install && cd ..
```

## Step 2: Start Metro Bundler

```bash
npm start
```

Keep this terminal open.

## Step 3: Run the App

Open a new terminal window:

```bash
# Android
npm run android

# iOS
npm run ios
```

## Step 4: Test Features

Once the app loads:

1. **View PDF** - The PDF should load automatically
2. **Create Bookmark** - Tap 🔖 icon, add a bookmark
3. **Export Page** - Tap 🖼️ icon, export current page
4. **View Bookmarks** - Tap 📚 icon, see all bookmarks
5. **Check Analytics** - Tap 📊 icon, view reading stats

## 🎉 That's It!

The app demonstrates all features of `react-native-pdf-jsi`. Check the main README.md for detailed documentation.

---

## Troubleshooting

**Metro bundler issues?**
```bash
npm start -- --reset-cache
```

**Android build fails?**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

**iOS build fails?**
```bash
cd ios && bundle exec pod install && cd ..
npm run ios
```

**PDF not loading?**
- Check internet connection
- Verify the PDF URL is accessible
- Check console logs for errors

---

**Need help?** Check the main README.md for detailed troubleshooting.

