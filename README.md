# 📚 React Native PDF JSI - Demo App

> **A comprehensive demonstration app showcasing all features of the [`react-native-pdf-jsi`](https://www.npmjs.com/package/react-native-pdf-jsi) package**

This demo app provides a complete reference implementation of all PDF viewing, bookmarking, export, and analytics features available in the [`react-native-pdf-jsi`](https://www.npmjs.com/package/react-native-pdf-jsi) package. Use this as a starting point for your own PDF viewer applications.

[![npm version](https://img.shields.io/npm/v/react-native-pdf-jsi?style=flat-square&logo=npm&color=cb3837)](https://www.npmjs.com/package/react-native-pdf-jsi)
[![npm downloads](https://img.shields.io/npm/dt/react-native-pdf-jsi?style=flat-square&logo=npm&color=cb3837)](https://www.npmjs.com/package/react-native-pdf-jsi)
[![GitHub stars](https://img.shields.io/github/stars/126punith/react-native-pdf-jsi?style=flat-square&logo=github&color=181717)](https://github.com/126punith/react-native-pdf-jsi)
[![license](https://img.shields.io/npm/l/react-native-pdf-jsi?style=flat-square&color=green)](https://github.com/126punith/react-native-pdf-jsi/blob/main/LICENSE)

---

## 🎯 Purpose

This demo app serves as:

- **Reference Implementation** - See how to integrate all package features correctly
- **Testing Ground** - Verify package functionality and features
- **Learning Resource** - Understand best practices for PDF viewer apps
- **GitHub Showcase** - Demonstrate the package's capabilities to developers

---

## ✨ Features Demonstrated

### Core Features
- ✅ PDF viewing with zoom, pan, and navigation
- ✅ Page-by-page navigation
- ✅ Real-time page tracking

### Bookmarks
- ✅ Create bookmarks with custom names and colors
- ✅ View all bookmarks in a list
- ✅ Navigate to bookmarked pages
- ✅ Delete bookmarks
- ✅ Visual bookmark indicator on PDF viewer

### Export
- ✅ Export single page to image (PNG/JPEG)
- ✅ Export multiple pages to images
- ✅ Export custom page ranges
- ✅ Export PDF text content
- ✅ All exports saved to Downloads/PDFDemoApp folder

### PDF Operations
- ✅ Split PDF into multiple files
- ✅ Extract specific pages to new PDF
- ✅ Rotate pages
- ✅ Compress PDF files
- ✅ All operations save results to Downloads folder

### Analytics
- ✅ Reading progress tracking
- ✅ Time spent per session
- ✅ Pages read statistics
- ✅ Reading speed metrics
- ✅ Session history

### File Management (Android)
- ✅ Download PDFs to public storage
- ✅ Open Downloads folder
- ✅ Files visible in system file manager

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- React Native 0.82+
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone or download this repository**

```bash
cd DemoApp
```

2. **Install dependencies**

```bash
npm install
```

> **Note**: This demo app uses `react-native-pdf-jsi` v3.4.0. To install the latest version in your own project:
> ```bash
> npm install react-native-pdf-jsi@latest
> ```

3. **Install iOS dependencies** (iOS only)

```bash
cd ios && bundle exec pod install && cd ..
```

4. **Run the app**

```bash
# Android
npm run android

# iOS
npm run ios
```

---

## 📁 Project Structure

```
DemoApp/
├── App.tsx                 # Main application component
├── components/
│   └── BookmarkIndicator.jsx  # Floating bookmark button component
├── node_modules/
│   └── react-native-pdf-jsi/  # Package installed locally
├── android/                # Android native code
├── ios/                    # iOS native code
└── README.md              # This file
```

---

## 🎨 UI Components

The app uses components from `react-native-pdf-jsi` package:

- **Toolbar** - Top navigation bar with feature buttons
- **BookmarkModal** - Create/edit bookmarks
- **BookmarkListModal** - View all bookmarks
- **BookmarkIndicator** - Floating bookmark button
- **ExportMenu** - Export options menu
- **OperationsMenu** - PDF operations menu
- **AnalyticsPanel** - Reading analytics display
- **Toast** - Notification messages
- **LoadingOverlay** - Loading indicator

---

## 📤 File Saving

All exported files and PDF operations save to:

**Android**: `Downloads/PDFDemoApp/`

Files are saved using Android's MediaStore API (Android 10+) for proper visibility in file managers.

### Exported Files Location

- **Images**: `Downloads/PDFDemoApp/page_1_*.jpeg`
- **Extracted PDFs**: `Downloads/PDFDemoApp/*_extracted_*.pdf`
- **Split PDFs**: `Downloads/PDFDemoApp/*_part_*.pdf`

All operations show success alerts with "Open Folder" option to view saved files.

---

## 🔧 Key Implementation Patterns

### 1. PDF Path Management

The app uses multiple strategies to get the PDF file path:

```typescript
const getPDFLocalPath = async (): Promise<string | null> => {
  // Method 1: From state (set by onLoadComplete)
  if (pdfFilePath && pdfFilePath.trim() !== '') {
    return pdfFilePath;
  }
  
  // Method 2: From PDF component ref
  if (pdfRef.current?.getPath) {
    return pdfRef.current.getPath();
  }
  
  // Method 3: From component state
  if (pdfRef.current?.state?.path) {
    return pdfRef.current.state.path;
  }
  
  return null;
};
```

### 2. File Download Pattern

All exports follow this pattern:

```typescript
// 1. Export to cache first
const imagePath = await exportManager.exportPageToImage(...);

// 2. Download to public Downloads folder
const downloadedFiles = await downloadExportedPDFs(imagePath);

// 3. Show success alert with Open Folder option
Alert.alert('✅ Export Successful', message, [
  { text: 'Done' },
  { 
    text: 'Open Folder',
    onPress: () => FileManager.openDownloadsFolder()
  }
]);
```

### 3. Page Number Handling

**Important**: ExportManager expects 1-indexed page numbers (Page 1, Page 2, etc.)

```typescript
// ✅ Correct - Pass 1-indexed page number
await exportManager.exportPageToImage(pdfPath, pageNumber);

// ❌ Wrong - Don't convert to 0-indexed
await exportManager.exportPageToImage(pdfPath, pageNumber - 1);
```

The ExportManager handles conversion to 0-indexed internally for native modules.

---

## 📱 Usage Examples

### Export Current Page

```typescript
await handleExport({
  type: 'single',
  page: currentPage,
  format: 'jpeg',
  quality: 0.9
});
```

### Extract Pages

```typescript
await handlePDFOperation('extract', {
  pages: [1, 5, 10] // 1-indexed page numbers
});
```

### Split PDF

```typescript
await handlePDFOperation('split', {
  ranges: [1, 5, 6, 10] // Flat array: [start1, end1, start2, end2]
});
```

---

## 🐛 Troubleshooting

### PDF Not Loading

- Check internet connection if loading from URL
- Verify PDF file exists if loading from local path
- Check console logs for error messages

### Exports Not Working

- Ensure PDF has fully loaded (`pdfFilePath` is set)
- Check that file path is valid (not empty or URI)
- Verify native module is available

### Files Not Visible in Downloads

- Android 10+: Files use MediaStore API, should be visible automatically
- Check `Downloads/PDFDemoApp/` folder specifically
- Use "Open Folder" button in success alert

### Bookmark Issues

- PDF must be loaded before creating bookmarks
- Check that `pdfIdentifier` or `pdfFilePath` is set
- BookmarkManager must be initialized

---

## 📝 Code Highlights

### State Management

```typescript
// Core PDF State
const [pdfFilePath, setPdfFilePath] = useState<string>('');
const [currentPage, setCurrentPage] = useState<number>(1);
const [totalPages, setTotalPages] = useState<number>(0);

// Feature State
const [bookmarks, setBookmarks] = useState<any[]>([]);
const [currentBookmark, setCurrentBookmark] = useState<any>(null);
const [analytics, setAnalytics] = useState<any>(null);
```

### Manager Initialization

```typescript
useEffect(() => {
  const initializeManagers = async () => {
    // Import singleton instances
    exportManager = require('react-native-pdf-jsi/src/managers/ExportManager').default;
    bookmarkManager = require('react-native-pdf-jsi/src/managers/BookmarkManager').default;
    
    // Initialize if needed
    await bookmarkManager.initialize();
  };
  initializeManagers();
}, []);
```

---

## 🔗 Package Documentation

For detailed package documentation, visit:

- 📖 **[Package README](https://github.com/126punith/react-native-pdf-jsi/blob/main/README.md)** - Complete documentation
- 📦 **[NPM Package](https://www.npmjs.com/package/react-native-pdf-jsi)** - Install and view package
- 🌐 **[Documentation Website](https://euphonious-faun-24f4bc.netlify.app/)** - Interactive API reference
- 💻 **[GitHub Repository](https://github.com/126punith/react-native-pdf-jsi)** - Source code and issues
- 🐛 **[Report Issues](https://github.com/126punith/react-native-pdf-jsi/issues)** - Bug reports and feature requests
- 💬 **[Discussions](https://github.com/126punith/react-native-pdf-jsi/discussions)** - Community discussions

---

## 📄 License

This demo app is provided as-is for reference purposes. The `react-native-pdf-jsi` package may have its own license terms.

---

## 🤝 Contributing

This is a demo/reference app. For issues or feature requests related to the package itself, please refer to the [main package repository](https://github.com/126punith/react-native-pdf-jsi).

- 🐛 **[Report Package Issues](https://github.com/126punith/react-native-pdf-jsi/issues)** - Report bugs or request features
- 💡 **[Submit Demo App Improvements](https://github.com/126punith/react-native-pdf-jsi/issues/new)** - Suggest improvements to this demo
- 📝 **[Contribution Guidelines](https://github.com/126punith/react-native-pdf-jsi/blob/main/CONTRIBUTING.md)** - How to contribute to the package

---

## 📞 Support

For questions about:

- **Package features**: 
  - 📖 [Package README](https://github.com/126punith/react-native-pdf-jsi/blob/main/README.md)
  - 🌐 [Documentation Website](https://euphonious-faun-24f4bc.netlify.app/)
- **This demo app**: Review the code comments and implementation patterns in this repository
- **Integration help**: See the code examples in this app's `App.tsx` file
- **Bug Reports**: 
  - 🐛 [Open an Issue](https://github.com/126punith/react-native-pdf-jsi/issues)
  - 💬 [Start a Discussion](https://github.com/126punith/react-native-pdf-jsi/discussions)

---

## 📦 Package Information

- **Package Name**: [`react-native-pdf-jsi`](https://www.npmjs.com/package/react-native-pdf-jsi)
- **Version**: `3.4.0` (Latest)
- **License**: MIT
- **GitHub**: [https://github.com/126punith/react-native-pdf-jsi](https://github.com/126punith/react-native-pdf-jsi)
- **NPM**: [https://www.npmjs.com/package/react-native-pdf-jsi](https://www.npmjs.com/package/react-native-pdf-jsi)
- **Documentation**: [https://euphonious-faun-24f4bc.netlify.app/](https://euphonious-faun-24f4bc.netlify.app/)

---

**Built with [`react-native-pdf-jsi`](https://www.npmjs.com/package/react-native-pdf-jsi) v3.4.0**

**Last Updated**: 2025-11-29

---

# react-native-pdf-jsi-demo-app
