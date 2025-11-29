# 📚 React Native PDF JSI - Demo App

> **A comprehensive demonstration app showcasing all features of the `react-native-pdf-jsi` package**

This demo app provides a complete reference implementation of all PDF viewing, bookmarking, export, and analytics features available in the `react-native-pdf-jsi` package. Use this as a starting point for your own PDF viewer applications.

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
- [react-native-pdf-jsi README](../react-native-enhanced-pdf/README.md)
- [Package Examples](../react-native-enhanced-pdf/EXAMPLES.md)

---

## 📄 License

This demo app is provided as-is for reference purposes. The `react-native-pdf-jsi` package may have its own license terms.

---

## 🤝 Contributing

This is a demo/reference app. For issues or feature requests related to the package itself, please refer to the main package repository.

---

## 📞 Support

For questions about:
- **Package features**: Check the main package README
- **This demo app**: Review the code comments and implementation patterns
- **Integration help**: See the code examples in this app

---

**Built with `react-native-pdf-jsi` v3.0.1**

**Last Updated**: 2025-11-29
# react-native-pdf-jsi-demo-app
