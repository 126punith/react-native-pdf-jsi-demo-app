/**
 * Comprehensive PDF Features Test App
 * Tests all features from react-native-pdf-jsi package
 *
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// Import the Pdf component from react-native-pdf-jsi
// @ts-ignore - Local package may not have complete type definitions during development
import Pdf from 'react-native-pdf-jsi';

// Import Managers - Import singletons directly from manager files
// @ts-ignore - Package exports may not have complete type definitions
let ExportManagerClass: any, BookmarkManagerClass: any, AnalyticsManagerClass: any;
let FileManager: any, CacheManager: any;
let Toolbar: any, BookmarkModal: any, BookmarkListModal: any;
let ExportMenu: any, OperationsMenu: any, AnalyticsPanel: any, Toast: any, LoadingOverlay: any;

try {
  const packageExports = require('react-native-pdf-jsi');
  
  // Get classes for managers
  ExportManagerClass = packageExports?.ExportManager;
  BookmarkManagerClass = packageExports?.BookmarkManager;
  AnalyticsManagerClass = packageExports?.AnalyticsManager;
  FileManager = packageExports?.FileManager;
  CacheManager = packageExports?.CacheManager;
  
  // Get UI components
  Toolbar = packageExports?.Toolbar;
  BookmarkModal = packageExports?.BookmarkModal;
  BookmarkListModal = packageExports?.BookmarkListModal;
  ExportMenu = packageExports?.ExportMenu;
  OperationsMenu = packageExports?.OperationsMenu;
  AnalyticsPanel = packageExports?.AnalyticsPanel;
  Toast = packageExports?.Toast;
  LoadingOverlay = packageExports?.LoadingOverlay;
} catch (error) {
  console.error('Failed to import package exports:', error);
}

// Import JSI Hook (with error handling)
let usePDFJSI: any = null;
let PDFJSI: any = null;
try {
  const PDFJSIModule = require('react-native-pdf-jsi/src/PDFJSI');
  const usePDFJSIModule = require('react-native-pdf-jsi/src/hooks/usePDFJSI');
  PDFJSI = PDFJSIModule.default;
  usePDFJSI = usePDFJSIModule.default;
} catch (error) {
  console.log('JSI not available, using fallback:', error);
}

// Initialize Managers (will be instantiated in component after imports)
let exportManager: any;
let bookmarkManager: any;
let analyticsManager: any;
// FileManager is a static class, no instantiation needed

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const pdfRef = useRef<any>(null);

  // PDF State
  const [pdfFilePath, setPdfFilePath] = useState<string>('');
  const [pdfIdentifier, setPdfIdentifier] = useState<string>(''); // PDF ID for bookmarks (path or URI)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Feature Modals State
  const [showBookmarkModal, setShowBookmarkModal] = useState<boolean>(false);
  const [showBookmarkList, setShowBookmarkList] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showOperationsMenu, setShowOperationsMenu] = useState<boolean>(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState<boolean>(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState<boolean>(false);

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // JSI State
  const [jsiAvailable, setJsiAvailable] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<any>(null);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  // Use JSI Hook if available
  const jsiHookResult = usePDFJSI
    ? usePDFJSI({
        autoInitialize: true,
        enablePerformanceTracking: true,
        enableCaching: true,
        maxCacheSize: 200,
      })
    : { isJSIAvailable: false, isInitialized: true };

  // PDF source configuration
  const pdfSource = {
    uri: 'http://samples.leanpub.com/thereactnativebook-sample.pdf',
    cache: true,
  };

  // Initialize PDF identifier with source URI immediately (fallback if file path not available)
  useEffect(() => {
    if (pdfSource && pdfSource.uri) {
      console.log('📁 [App] Initializing PDF identifier with source URI:', pdfSource.uri);
      setPdfIdentifier(pdfSource.uri);
      console.log('✅ [App] PDF identifier initialized, bookmarks can now work');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Initialize Managers on Mount
  useEffect(() => {
    const initializeManagers = async () => {
      try {
        // Import singleton instances directly from manager files (they export default singleton)
        const exportMgrModule = require('react-native-pdf-jsi/src/managers/ExportManager');
        const bookmarkMgrModule = require('react-native-pdf-jsi/src/managers/BookmarkManager');
        const analyticsMgrModule = require('react-native-pdf-jsi/src/managers/AnalyticsManager');
        
        // Use default exports (singleton instances)
        exportManager = exportMgrModule.default || exportMgrModule.ExportManager || exportMgrModule;
        bookmarkManager = bookmarkMgrModule.default || bookmarkMgrModule.BookmarkManager || bookmarkMgrModule;
        analyticsManager = analyticsMgrModule.default || analyticsMgrModule.AnalyticsManager || analyticsMgrModule;
        
        console.log('✅ Managers loaded successfully');
        console.log('📦 ExportManager type:', typeof exportManager);
        console.log('📦 BookmarkManager type:', typeof bookmarkManager);
        console.log('📦 AnalyticsManager type:', typeof analyticsManager);
        
        // Initialize managers if they have initialize method
        if (bookmarkManager && typeof bookmarkManager.initialize === 'function') {
          console.log('🔄 Initializing BookmarkManager...');
          await bookmarkManager.initialize();
          console.log('✅ BookmarkManager initialized');
        } else {
          console.warn('⚠️ BookmarkManager.initialize not available');
        }
        
        if (analyticsManager && typeof analyticsManager.initialize === 'function') {
          console.log('🔄 Initializing AnalyticsManager...');
          await analyticsManager.initialize();
          console.log('✅ AnalyticsManager initialized');
        } else {
          console.warn('⚠️ AnalyticsManager.initialize not available');
        }
        
        console.log('✅ All managers initialized successfully');
      } catch (error: any) {
        console.error('❌ Failed to initialize managers:', error);
        console.error('Error details:', error?.message, error?.stack);
      }
    };
    initializeManagers();
  }, []);

  // Check JSI Availability
  useEffect(() => {
    const checkJSI = async () => {
      try {
        if (PDFJSI) {
          const isAvailable = await PDFJSI.checkJSIAvailability();
          setJsiAvailable(isAvailable);
          console.log('📱 JSI Available:', isAvailable);
        }
      } catch (error) {
        console.warn('JSI check failed:', error);
      }
    };
    checkJSI();
  }, []);

    // Auto-load bookmarks when PDF loads
  useEffect(() => {
    const pdfId = pdfIdentifier || pdfFilePath;
    if (pdfId && bookmarkManager) {
      console.log('📚 [App] PDF loaded, auto-loading bookmarks for:', pdfId);
      loadBookmarks().catch(err => console.error('Failed to auto-load bookmarks:', err));
      loadAnalytics().catch(err => console.error('Failed to auto-load analytics:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfIdentifier, pdfFilePath]); // bookmarkManager and load functions are stable references

  // Log bookmark modal visibility changes
  useEffect(() => {
    if (showBookmarkModal) {
      console.log('📚 [App] BookmarkModal opened');
      console.log('📚 [App] Current page:', currentPage);
      console.log('📚 [App] PDF file path:', pdfFilePath);
      console.log('📚 [App] PDF identifier:', pdfIdentifier);
    } else {
      console.log('📚 [App] BookmarkModal closed');
    }
  }, [showBookmarkModal, currentPage, pdfFilePath]);

  // Handle PDF Load Complete
  // onLoadComplete callback signature: (numberOfPages, path, size, tableContents)
  const handleLoadComplete = async (numberOfPages: number, filePath: string, size?: any, tableContents?: any) => {
    console.log(`✅ [App] PDF loaded successfully: ${numberOfPages} pages`);
    console.log(`📁 [App] All parameters received:`, {
      numberOfPages,
      filePath,
      size,
      tableContents,
    });
    console.log(`📁 [App] File path type:`, typeof filePath);
    console.log(`📁 [App] File path length:`, filePath?.length || 0);
    console.log(`📁 [App] File path value:`, filePath);
    
    // Set the file path
    if (filePath && typeof filePath === 'string' && filePath.trim() !== '') {
      console.log('✅ [App] Valid file path received, using for PDF identifier');
      setPdfFilePath(filePath);
      setPdfIdentifier(filePath); // Use file path as identifier
    } else {
      console.warn('⚠️ [App] WARNING: PDF loaded but file path is empty or invalid!');
      console.warn('⚠️ [App] Using PDF source URI as fallback identifier for bookmarks...');
      
      // Use PDF source URI as identifier if file path is not available
      if (pdfSource && typeof pdfSource === 'object' && pdfSource.uri) {
        console.log('📁 [App] Using PDF source URI as identifier:', pdfSource.uri);
        setPdfFilePath(''); // Keep file path empty since it's not available
        setPdfIdentifier(pdfSource.uri); // Use URI as identifier for bookmarks
      } else {
        console.error('❌ [App] No file path available and no source URI found');
        setPdfFilePath('');
        setPdfIdentifier(''); // No identifier available
      }
    }
    
    setTotalPages(numberOfPages);
    showToast(`PDF loaded: ${numberOfPages} pages`);
    
    // Track initial progress with BookmarkManager
    if (filePath && filePath.trim() !== '' && bookmarkManager) {
      try {
        console.log('📊 [App] Tracking initial reading progress...');
        await bookmarkManager?.updateProgress(filePath, {
          currentPage: 1,
          totalPages: numberOfPages,
          newSession: true,
          timestamp: Date.now(),
        });
        console.log('✅ [App] Initial progress tracked');
      } catch (error: any) {
        console.warn('⚠️ [App] Failed to track initial progress:', error?.message);
      }
    } else {
      if (!filePath || filePath.trim() === '') {
        console.warn('⚠️ [App] Skipping progress tracking - file path is empty');
      }
      if (!bookmarkManager) {
        console.warn('⚠️ [App] Skipping progress tracking - BookmarkManager not available');
      }
    }
  };

  // Handle PDF Error
  const handleError = (error: any) => {
    console.error('❌ PDF loading error:', error);
    showToast('PDF loading error: ' + (error.message || 'Unknown error'));
  };

  // Extract path from PDF component when PDF loads - fallback mechanism
  // This runs when totalPages changes (indicating PDF loaded) or periodically as fallback
  useEffect(() => {
    if ((!pdfFilePath || pdfFilePath.trim() === '') && pdfRef.current && totalPages > 0) {
      const extractPath = () => {
        try {
          // Try multiple ways to get the path from the component
          const componentPath = 
            pdfRef.current?.getPath?.() || 
            pdfRef.current?.downloadedFilePath || 
            pdfRef.current?.state?.path || 
            '';
          
          if (componentPath && componentPath.trim() !== '') {
            console.log('📁 [App] Extracted path from PDF component via useEffect:', componentPath);
            setPdfFilePath(componentPath);
            setPdfIdentifier(componentPath);
            return true;
          }
        } catch (error: any) {
          console.warn('⚠️ [App] Failed to extract path from PDF component:', error?.message);
        }
        return false;
      };
      
      // Try immediately
      if (!extractPath()) {
        // Retry after a short delay if not available yet
        const timeout = setTimeout(() => {
          extractPath();
        }, 500);
        return () => clearTimeout(timeout);
      }
    }
  }, [totalPages, pdfFilePath]);

  // Handle Page Changed
  const handlePageChanged = async (page: number, numberOfPages: number) => {
    console.log(`📄 Page changed: ${page}/${numberOfPages}`);
    setCurrentPage(page);
    
    // Extract path from PDF component if not already set
    // This is a fallback in case handleLoadComplete wasn't called or didn't receive the path
    if ((!pdfFilePath || pdfFilePath.trim() === '') && pdfRef.current) {
      try {
        // Check if the component has a getPath method
        const componentPath = pdfRef.current.getPath?.() || pdfRef.current.downloadedFilePath || pdfRef.current.state?.path || '';
        if (componentPath && componentPath.trim() !== '') {
          console.log('📁 [App] Extracted path from PDF component in handlePageChanged:', componentPath);
          setPdfFilePath(componentPath);
          setPdfIdentifier(componentPath);
        }
      } catch (error: any) {
        console.warn('⚠️ [App] Failed to extract path from PDF component:', error?.message);
      }
    }
    
    // Update reading progress with BookmarkManager
    const pdfId = pdfIdentifier || pdfFilePath;
    if (pdfId && bookmarkManager) {
      try {
        console.log('📊 [App] Updating reading progress:', { pdfId, page, numberOfPages });
        await bookmarkManager.updateProgress(pdfId, {
          currentPage: page,
          totalPages: numberOfPages,
          timestamp: Date.now(),
        });
        console.log('✅ [App] Progress updated successfully');
      } catch (error: any) {
        console.warn('⚠️ [App] Failed to update progress:', error?.message);
      }
    } else {
      if (!pdfId) {
        console.warn('⚠️ [App] Skipping progress update - no PDF identifier available');
      }
      if (!bookmarkManager) {
        console.warn('⚠️ [App] Skipping progress update - BookmarkManager not available');
      }
    }
  };

  // Toast Helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    // Toast component handles auto-hide via duration prop
    // onHide callback will be called when toast finishes hiding
  };

  // ============================================
  // BOOKMARK FEATURES
  // ============================================

  const handleCreateBookmark = async (bookmark: any) => {
    console.log('📚 [App] handleCreateBookmark called:', { bookmark, currentPage, pdfFilePath });
    
    try {
      if (!bookmarkManager) {
        console.error('❌ [App] BookmarkManager not initialized');
        const error = new Error('Bookmark manager not ready. Please wait...');
        showToast(error.message);
        throw error; // Throw error so BookmarkModal can catch it
      }

      // Use pdfIdentifier instead of pdfFilePath for bookmarks
      const pdfId = pdfIdentifier || pdfFilePath;
      
      if (!pdfId || pdfId.trim() === '') {
        console.warn('⚠️ [App] PDF not loaded yet, cannot create bookmark');
        const error = new Error('PDF not loaded yet. Please wait for the PDF to load completely.');
        showToast(error.message);
        throw error; // Throw error so BookmarkModal can catch it
      }
      
      console.log('📚 [App] Creating bookmark with data:', { 
        name: bookmark?.name, 
        color: bookmark?.color, 
        notes: bookmark?.notes,
        page: currentPage,
        pdfId: pdfId,
        pdfFilePath: pdfFilePath,
        pdfIdentifier: pdfIdentifier,
      });
      const bookmarkData = {
        ...bookmark,
        page: currentPage,
      };
      
      console.log('📚 [App] Calling bookmarkManager.createBookmark...');
      const result = await bookmarkManager?.createBookmark(pdfId, bookmarkData);
      
      console.log('✅ [App] Bookmark created successfully:', result);
      
      console.log('📚 [App] Reloading bookmarks...');
      await loadBookmarks();
      
      console.log('📚 [App] Closing bookmark modal');
      setShowBookmarkModal(false);
      showToast('Bookmark created successfully');
    } catch (error: any) {
      console.error('❌ [App] Failed to create bookmark:', error);
      console.error('❌ [App] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      showToast(`Failed to create bookmark: ${error?.message || 'Unknown error'}`);
      throw error; // Re-throw so BookmarkModal can handle it
    }
  };

  const loadBookmarks = async () => {
    try {
      if (!bookmarkManager) {
        console.warn('⚠️ [App] BookmarkManager not initialized, skipping bookmark load');
        return;
      }

      const pdfId = pdfIdentifier || pdfFilePath;
      
      if (!pdfId) {
        console.warn('⚠️ [App] No PDF identifier, skipping bookmark load');
        return;
      }
      console.log('📚 [App] Loading bookmarks for PDF:', pdfId);
      
      const allBookmarks = await bookmarkManager?.getBookmarks(pdfId);
      console.log('📚 [App] Loaded bookmarks:', {
        count: allBookmarks?.length || 0,
        bookmarks: allBookmarks || [],
      });
      
      setBookmarks(allBookmarks || []);
      console.log('📚 [App] Bookmarks state updated');
    } catch (error: any) {
      console.error('❌ [App] Failed to load bookmarks:', error);
      console.error('❌ [App] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    console.log('🗑️ [App] handleDeleteBookmark called:', { bookmarkId, pdfFilePath });
    
    try {
      if (!bookmarkManager) {
        console.error('❌ [App] BookmarkManager not initialized');
        showToast('Bookmark manager not ready');
        return;
      }
      
      const pdfId = pdfIdentifier || pdfFilePath;
      
      if (!pdfId) {
        console.warn('⚠️ [App] No PDF identifier');
        showToast('PDF not loaded');
        return;
      }
      
      console.log('🗑️ [App] Deleting bookmark...');
      await bookmarkManager?.deleteBookmark(pdfId, bookmarkId);
      console.log('✅ [App] Bookmark deleted, reloading...');
      await loadBookmarks();
      showToast('Bookmark deleted');
    } catch (error: any) {
      console.error('❌ [App] Failed to delete bookmark:', error);
      console.error('❌ [App] Error details:', {
        message: error?.message,
        stack: error?.stack,
      });
      showToast('Failed to delete bookmark');
    }
  };

  const handleNavigateToBookmark = (page: number) => {
    console.log('🧭 [App] handleNavigateToBookmark called:', { page });
    
    if (pdfRef.current && pdfRef.current.setPage) {
      console.log('🧭 [App] Navigating to page:', page);
      pdfRef.current.setPage(page);
    } else {
      console.warn('⚠️ [App] PDF ref not available or setPage not available');
    }
    setShowBookmarkList(false);
    showToast(`Navigated to page ${page}`);
  };

  // ============================================
  // EXPORT FEATURES
  // ============================================

  const handleExport = async (options: any) => {
    console.log('📤 [App] handleExport called:', options);
    
    try {
      if (!exportManager) {
        console.error('❌ [App] ExportManager not initialized');
        showToast('Export manager not ready. Please wait...');
        return;
      }

      // Export operations require actual file path (not URI) for native modules
      if (!pdfFilePath || pdfFilePath.trim() === '') {
        console.warn('⚠️ [App] PDF file path not available - exports require actual file path');
        console.warn('⚠️ [App] PDF identifier:', pdfIdentifier);
        console.warn('⚠️ [App] PDF file path:', pdfFilePath);
        showToast('PDF file path not available. Please wait for PDF to load completely.');
        return;
      }

      console.log('📤 [App] Starting export with options:', {
        ...options,
        pdfFilePath,
        currentPage,
        totalPages,
      });
      setShowLoadingOverlay(true);

      if (options.type === 'single') {
        // Export single page
        const pageNumber = options.page || currentPage;
        console.log('📤 [App] Exporting single page:', pageNumber);
        const imagePath = await exportManager.exportPageToImage(
          pdfFilePath,
          pageNumber - 1, // Convert to 0-indexed
          {
            format: options.format || 'jpeg',
            quality: options.quality || 0.9,
            scale: 2.0,
          },
        );
        console.log('✅ [App] Page exported successfully:', imagePath);
        showToast(`Page exported: ${imagePath}`);
        await Share.share({ url: `file://${imagePath}` });
      } else if (options.type === 'all') {
        // Export all pages
        console.log('📤 [App] Exporting all pages...');
        const images = await exportManager.exportToImages(pdfFilePath, {
          format: options.format || 'jpeg',
          quality: options.quality || 0.9,
          scale: 2.0,
        });
        console.log('✅ [App] All pages exported:', images.length);
        showToast(`Exported ${images.length} pages`);
      } else if (options.type === 'text') {
        // Export to text
        if (options.page) {
          console.log('📤 [App] Exporting page to text:', options.page);
          const text = await exportManager.exportPageToText(
            pdfFilePath,
            options.page - 1, // Convert to 0-indexed
          );
          console.log('✅ [App] Text exported, length:', text.length);
          showToast(`Text exported (${text.length} chars)`);
          await Share.share({ message: text });
        } else {
          console.log('📤 [App] Exporting all pages to text...');
          const allText = await exportManager.exportAllToText(pdfFilePath);
          console.log('✅ [App] All text exported, length:', allText.length);
          showToast(`All text exported`);
          await Share.share({ message: allText });
        }
      }

      setShowLoadingOverlay(false);
      console.log('✅ [App] Export completed successfully');
    } catch (error: any) {
      console.error('❌ [App] Export failed:', error);
      console.error('❌ [App] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      showToast('Export failed: ' + (error?.message || 'Unknown error'));
      setShowLoadingOverlay(false);
    }
  };

  // ============================================
  // PDF OPERATIONS
  // ============================================

  const handlePDFOperation = async (operation: string, options: any = {}) => {
    console.log('⚙️ [App] handlePDFOperation called:', { operation, options });
    
    try {
      if (!exportManager) {
        console.error('❌ [App] ExportManager not initialized');
        showToast('Operations manager not ready. Please wait...');
        return;
      }

      // PDF operations require actual file path (not URI) for native modules
      if (!pdfFilePath || pdfFilePath.trim() === '') {
        console.warn('⚠️ [App] PDF file path not available - operations require actual file path');
        console.warn('⚠️ [App] PDF identifier:', pdfIdentifier);
        console.warn('⚠️ [App] PDF file path:', pdfFilePath);
        showToast('PDF file path not available. Please wait for PDF to load completely.');
        return;
      }

      console.log('⚙️ [App] Starting PDF operation:', {
        operation,
        options,
        pdfFilePath,
        currentPage,
        totalPages,
      });
      setShowLoadingOverlay(true);

      let result: any = { message: 'Operation completed' };
      
      switch (operation) {
        case 'split':
          // Split PDF at current page
          console.log('⚙️ [App] Splitting PDF at page:', currentPage);
          const splitPath = await exportManager.splitPDF(pdfFilePath, [
            { start: 1, end: currentPage },
            { start: currentPage + 1, end: totalPages },
          ]);
          console.log('✅ [App] PDF split successfully:', splitPath);
          result = { message: `PDF split into ${splitPath.length} files` };
          showToast(result.message);
          break;

        case 'extract':
          // Extract current page
          console.log('⚙️ [App] Extracting page:', currentPage);
          const extractPath = await exportManager.extractPages(
            pdfFilePath,
            [currentPage],
          );
          console.log('✅ [App] Page extracted successfully:', extractPath);
          result = { message: `Page extracted: ${extractPath}` };
          showToast(result.message);
          break;

        case 'rotate':
          // Rotate current page 90 degrees
          console.log('⚙️ [App] Rotating page:', currentPage, 'by 90 degrees');
          await exportManager.rotatePage(pdfFilePath, currentPage - 1, 90); // Convert to 0-indexed
          console.log('✅ [App] Page rotated successfully');
          result = { message: 'Page rotated successfully' };
          showToast(result.message);
          break;

        case 'compress':
          // Compress PDF
          console.log('⚙️ [App] Compressing PDF with preset:', options.preset || 'WEB');
          const compressPath = await exportManager.compressPDF(pdfFilePath, {
            quality: options.preset || 'WEB',
          });
          console.log('✅ [App] PDF compressed successfully:', compressPath);
          result = { message: `PDF compressed: ${compressPath}` };
          showToast(result.message);
          break;

        default:
          console.warn('⚠️ [App] Unknown operation:', operation);
          result = { message: 'Operation not implemented' };
          showToast(result.message);
      }
      
      setShowLoadingOverlay(false);
      console.log('✅ [App] PDF operation completed:', result);
      return result;
    } catch (error: any) {
      console.error('❌ [App] PDF operation failed:', error);
      console.error('❌ [App] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        operation,
      });
      showToast('Operation failed: ' + (error?.message || 'Unknown error'));
      setShowLoadingOverlay(false);
      throw error; // Re-throw so caller can handle it
    }
  };

  // ============================================
  // ANALYTICS FEATURES
  // ============================================

  const loadAnalytics = async () => {
    try {
      if (!bookmarkManager) {
        console.warn('⚠️ BookmarkManager not initialized, skipping analytics load');
        return;
      }

      const pdfId = pdfIdentifier || pdfFilePath;
      
      if (!pdfId) return;
      console.log('📊 Loading analytics for:', pdfId);
      
      // Get statistics from BookmarkManager (which tracks reading progress)
      const stats = await bookmarkManager?.getStatistics(pdfId);
      console.log('📊 Analytics loaded:', stats);
      setAnalytics(stats);
      
      // Optionally get detailed analytics from AnalyticsManager if available
      if (analyticsManager && typeof analyticsManager.getAnalytics === 'function') {
        try {
          const detailedAnalytics = await analyticsManager?.getAnalytics(pdfId);
          console.log('📊 Detailed analytics loaded:', detailedAnalytics);
          // Merge detailed analytics with basic stats
          setAnalytics({ ...stats, ...detailedAnalytics });
        } catch (error: any) {
          console.warn('⚠️ Failed to load detailed analytics, using basic stats:', error?.message);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to load analytics:', error);
      console.error('Error details:', error?.message, error?.stack);
    }
  };

  // Load analytics when panel opens
  useEffect(() => {
    if (showAnalyticsPanel && pdfFilePath) {
      loadAnalytics();
    }
  }, [showAnalyticsPanel, pdfFilePath]);

  // ============================================
  // FILE MANAGEMENT (Android)
  // ============================================

  const handleDownloadPDF = async () => {
    console.log('💾 [App] handleDownloadPDF called');
    
    try {
      // Download requires actual file path
      if (!pdfFilePath || pdfFilePath.trim() === '') {
        console.warn('⚠️ [App] PDF file path not available for download');
        console.warn('⚠️ [App] PDF identifier:', pdfIdentifier);
        showToast('PDF file path not available. Please wait for PDF to load completely.');
        return;
      }

      if (Platform.OS === 'android') {
        console.log('💾 [App] Downloading PDF to public folder:', pdfFilePath);
        await FileManager.downloadToPublicFolder(
          pdfFilePath,
          'document.pdf',
          'application/pdf',
        );
        console.log('✅ [App] PDF downloaded successfully');
        showToast('PDF downloaded to Downloads folder');
      } else {
        console.warn('⚠️ [App] File management only available on Android');
        showToast('File management only available on Android');
      }
    } catch (error: any) {
      console.error('❌ [App] Download failed:', error);
      console.error('❌ [App] Error details:', {
        message: error?.message,
        stack: error?.stack,
      });
      showToast('Download failed: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleOpenDownloadsFolder = async () => {
    console.log('📁 [App] handleOpenDownloadsFolder called');
    
    try {
      if (Platform.OS === 'android') {
        console.log('📁 [App] Opening Downloads folder...');
        await FileManager.openDownloadsFolder();
        console.log('✅ [App] Downloads folder opened');
        showToast('Opening Downloads folder');
      } else {
        console.warn('⚠️ [App] File management only available on Android');
        showToast('File management only available on Android');
      }
    } catch (error: any) {
      console.error('❌ [App] Failed to open folder:', error);
      console.error('❌ [App] Error details:', {
        message: error?.message,
        stack: error?.stack,
      });
      showToast('Failed to open folder: ' + (error?.message || 'Unknown error'));
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Toolbar */}
        {Toolbar && (
          <Toolbar
            title="PDF Features Demo"
            subtitle={`Page ${currentPage}/${totalPages} ${jsiAvailable ? '⚡ JSI' : ''}`}
            buttons={[
              {
                icon: '📚',
                label: 'Bookmarks',
                onPress: () => setShowBookmarkList(true),
              },
              {
                icon: '📤',
                label: 'Export',
                onPress: () => setShowExportMenu(true),
              },
              {
                icon: '⚙️',
                label: 'Operations',
                onPress: () => setShowOperationsMenu(true),
              },
              {
                icon: '📊',
                label: 'Analytics',
                onPress: () => setShowAnalyticsPanel(true),
              },
            ]}
          />
        )}

        {/* PDF Viewer */}
        <View style={styles.pdfContainer}>
          {/* @ts-expect-error - Pdf component props may not be in type definitions */}
          <Pdf
            ref={pdfRef}
            source={pdfSource}
            style={styles.pdf}
            page={currentPage}
            onLoadComplete={handleLoadComplete}
            onPageChanged={handlePageChanged}
            onError={handleError}
            trustAllCerts={false}
            horizontal={false}
            enablePaging={true}
            enableRTL={false}
            spacing={10}
            fitPolicy={0}
          />
        </View>

        {/* Feature Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.buttonsContainer}
          contentContainerStyle={styles.buttonsContent}>
          {/* Bookmark Features */}
          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => {
              console.log('🔖 [App] Add Bookmark button pressed');
              console.log('🔖 [App] Current page:', currentPage);
              console.log('🔖 [App] PDF file path:', pdfFilePath);
              console.log('🔖 [App] PDF identifier:', pdfIdentifier);
              console.log('🔖 [App] BookmarkManager available:', !!bookmarkManager);
              
              const pdfId = pdfIdentifier || pdfFilePath;
              console.log('🔖 [App] Using PDF ID:', pdfId);
              
              if (!pdfId || pdfId.trim() === '') {
                console.warn('⚠️ [App] Cannot open bookmark modal - PDF not loaded');
                showToast('Please wait for PDF to load completely');
                return;
              }
              
              if (!bookmarkManager) {
                console.warn('⚠️ [App] Cannot open bookmark modal - BookmarkManager not ready');
                showToast('Bookmark manager not ready. Please wait...');
                return;
              }
              
              setShowBookmarkModal(true);
            }}>
            <Text style={styles.featureIcon}>🔖</Text>
            <Text style={styles.featureLabel}>Add Bookmark</Text>
          </TouchableOpacity>

          {/* Export Features */}
          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => handleExport({ type: 'single', page: currentPage })}>
            <Text style={styles.featureIcon}>🖼️</Text>
            <Text style={styles.featureLabel}>Export Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => handleExport({ type: 'all' })}>
            <Text style={styles.featureIcon}>📸</Text>
            <Text style={styles.featureLabel}>Export All</Text>
          </TouchableOpacity>

          {/* PDF Operations */}
          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => handlePDFOperation('extract')}>
            <Text style={styles.featureIcon}>✂️</Text>
            <Text style={styles.featureLabel}>Extract Page</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.featureButton}
            onPress={() => handlePDFOperation('rotate')}>
            <Text style={styles.featureIcon}>🔄</Text>
            <Text style={styles.featureLabel}>Rotate</Text>
          </TouchableOpacity>

          {/* File Management (Android) */}
          {Platform.OS === 'android' && (
            <>
              <TouchableOpacity
                style={styles.featureButton}
                onPress={handleDownloadPDF}>
                <Text style={styles.featureIcon}>💾</Text>
                <Text style={styles.featureLabel}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureButton}
                onPress={handleOpenDownloadsFolder}>
                <Text style={styles.featureIcon}>📁</Text>
                <Text style={styles.featureLabel}>Open Folder</Text>
              </TouchableOpacity>
            </>
          )}

          {/* JSI Status */}
          <TouchableOpacity
            style={[
              styles.featureButton,
              jsiAvailable && styles.featureButtonActive,
            ]}
            onPress={() => showToast(jsiAvailable ? 'JSI Active' : 'JSI Inactive')}>
            <Text style={styles.featureIcon}>
              {jsiAvailable ? '⚡' : '🔌'}
            </Text>
            <Text style={styles.featureLabel}>
              {jsiAvailable ? 'JSI On' : 'JSI Off'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modals and Overlays */}
        {BookmarkModal && (
          <BookmarkModal
            visible={showBookmarkModal}
            onClose={() => {
              console.log('📚 [App] BookmarkModal closing');
              setShowBookmarkModal(false);
            }}
            onSave={handleCreateBookmark}
            currentPage={currentPage}
          />
        )}

        {BookmarkListModal && (
          <BookmarkListModal
            visible={showBookmarkList}
            onClose={() => setShowBookmarkList(false)}
            bookmarks={bookmarks}
            onDelete={handleDeleteBookmark}
            onNavigate={handleNavigateToBookmark}
            currentPage={currentPage}
          />
        )}

        {ExportMenu && (
          <ExportMenu
            visible={showExportMenu}
            onClose={() => setShowExportMenu(false)}
            currentPage={currentPage}
            totalPages={totalPages}
            pdfPath={pdfFilePath}
            onExport={handleExport}
          />
        )}

        {OperationsMenu && (
          <OperationsMenu
            visible={showOperationsMenu}
            onClose={() => setShowOperationsMenu(false)}
            totalPages={totalPages}
            pdfPath={pdfFilePath}
            onOperation={handlePDFOperation}
          />
        )}

        {AnalyticsPanel && (
          <AnalyticsPanel
            visible={showAnalyticsPanel}
            onClose={() => setShowAnalyticsPanel(false)}
            analytics={analytics || {
              timeSpent: 0,
              pagesRead: [],
              totalPages: totalPages || 0,
              percentage: 0,
              sessions: 0,
              currentPage: currentPage || 1,
              lastRead: null,
            }}
          />
        )}

        {LoadingOverlay && (
          <LoadingOverlay visible={showLoadingOverlay} message="Processing..." />
        )}

        {Toast && toastVisible && (
          <Toast
            message={toastMessage}
            visible={toastVisible}
            duration={3000}
            onHide={() => setToastVisible(false)}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  buttonsContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
  },
  buttonsContent: {
    paddingHorizontal: 8,
  },
  featureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
  },
  featureButtonActive: {
    backgroundColor: '#e3f2fd',
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  featureLabel: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
});

export default App;