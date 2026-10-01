/**
 * React Native PDF JSI - Demo App
 * 
 * A comprehensive demonstration app showcasing all features of react-native-pdf-jsi package.
 * This app serves as a reference implementation for developers integrating PDF viewing
 * capabilities into their React Native applications.
 * 
 * Features demonstrated:
 * - PDF viewing with navigation and zoom
 * - Bookmarks with custom colors and notes
 * - Export to images (PNG/JPEG)
 * - PDF operations (split, extract, rotate, compress)
 * - Reading analytics and progress tracking
 * - File management (Android)
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
  NativeModules,
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
  let BookmarkIndicator: any;

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
  
  // Try to import BookmarkIndicator from package or use local component
  BookmarkIndicator = packageExports?.BookmarkIndicator;
  if (!BookmarkIndicator) {
    try {
      BookmarkIndicator = require('./components/BookmarkIndicator').default;
    } catch (e) {
      console.warn('BookmarkIndicator not available');
    }
  }
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
  const speedProbePath = useRef<string>('');

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
  const [currentBookmark, setCurrentBookmark] = useState<any>(null);

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

  // Reload bookmarks when page changes (to update currentBookmark)
  useEffect(() => {
    if (bookmarks.length > 0) {
      const pageBookmark = bookmarks.find((b: any) => b.page === currentPage);
      setCurrentBookmark(pageBookmark || null);
    }
  }, [currentPage, bookmarks]);

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

  const runSpeedProbe = async (filePath: string, pageCount: number) => {
    if (!PDFJSI || !filePath || speedProbePath.current === filePath) {
      return;
    }
    speedProbePath.current = filePath;
    const endPage = Math.max(1, pageCount || 1);
    const timed = async (name: string, fn: () => Promise<any>) => {
      const started = performance.now();
      try {
        const value = await fn();
        const ms = performance.now() - started;
        console.log(`[PERF] ${name} ${ms.toFixed(2)}ms`, value);
        return value;
      } catch (error: any) {
        const ms = performance.now() - started;
        console.log(`[PERF] ${name} failed ${ms.toFixed(2)}ms`, error?.message || error);
        return null;
      }
    };

    console.log('[PERF] speed probe start', { pdfId: filePath, pages: endPage });
    try {
      if (typeof PDFJSI.initializeJSI === 'function') {
        await PDFJSI.initializeJSI();
      }
      await timed('registerPathForSearch', () =>
        PDFJSI.registerPathForSearch(filePath, filePath)
      );
      await timed('getPageMetrics', () => PDFJSI.getPageMetrics(filePath, 1));
      const rendered = await timed('renderPageDirect', () =>
        PDFJSI.renderPageDirect(filePath, 1, 1, '')
      );
      if (rendered) {
        console.log('[PERF] render native', {
          width: rendered.width,
          height: rendered.height,
          renderTimeMs: rendered.renderTimeMs,
        });
      }
      const hits = await timed('searchTextDirect', () =>
        PDFJSI.searchTextDirect(filePath, 'React', 1, endPage)
      );
      if (hits) {
        console.log('[PERF] search hits', Array.isArray(hits) ? hits.length : hits);
      }
      await timed('getPerformanceMetrics', () =>
        PDFJSI.getPerformanceMetrics(filePath)
      );
      console.log('[PERF] speed probe end');
    } catch (error: any) {
      console.log('[PERF] speed probe failed', error?.message || error);
    }
  };

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

    if (filePath && filePath.trim() !== '') {
      await runSpeedProbe(filePath, numberOfPages);
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
    
    // Update totalPages (always update if different, or if not set yet)
    // This ensures totalPages is available even if onLoadComplete wasn't called
    if (numberOfPages > 0 && (totalPages === 0 || totalPages !== numberOfPages)) {
      console.log(`📄 [App] Updating totalPages from handlePageChanged: ${numberOfPages} (was: ${totalPages})`);
      setTotalPages(numberOfPages);
    }
    
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
    
    // Update current bookmark for new page
    const pageBookmark = bookmarks.find((b: any) => b.page === page);
    setCurrentBookmark(pageBookmark || null);
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
      
      // Check if current page has a bookmark
      const pageBookmark = allBookmarks?.find((b: any) => b.page === currentPage);
      setCurrentBookmark(pageBookmark || null);
      
      console.log('📚 [App] Bookmarks state updated, current page bookmark:', pageBookmark ? 'yes' : 'no');
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
    console.log(`🧭 [App] handleNavigateToBookmark: Jumping to page ${page}`);
    console.log(`🧭 [App] Current state - currentPage: ${currentPage}, totalPages: ${totalPages}`);
    
    // Basic validation - page must be at least 1
    if (page < 1) {
      console.error(`❌ [App] Invalid page: ${page} (must be >= 1)`);
      showToast(`Invalid page number`, 'error');
      return;
    }
    
    // Validate against totalPages if we have it
    // If totalPages is 0, allow navigation anyway - PDF component will handle validation
    if (totalPages > 0 && page > totalPages) {
      console.error(`❌ [App] Invalid page: ${page} (total: ${totalPages})`);
      showToast(`Invalid page number`, 'error');
      return;
    }
    
    // Close bookmark list first
    setShowBookmarkList(false);
    
    // If navigating to the same page, force a state change to trigger re-render
    // Temporarily set to 0, then to target page
    if (currentPage === page) {
      console.log(`🧭 [App] Same page detected (${page}), forcing state change to trigger navigation`);
      setCurrentPage(0);
      // Use setTimeout to ensure state update is processed before setting target page
      setTimeout(() => {
        setCurrentPage(page);
        // Also call setPage on ref to ensure native navigation
        if (pdfRef.current && typeof pdfRef.current.setPage === 'function') {
          setTimeout(() => {
            try {
              pdfRef.current.setPage(page);
            } catch (error: any) {
              console.warn(`⚠️ [App] setPage call failed:`, error?.message);
            }
          }, 50);
        }
      }, 10);
    } else {
      // Different page - normal navigation
      console.log(`🧭 [App] Updating currentPage state from ${currentPage} to ${page}`);
      setCurrentPage(page);
      
      // Call setPage on ref to ensure native navigation happens
      if (pdfRef.current && typeof pdfRef.current.setPage === 'function') {
        setTimeout(() => {
          try {
            console.log(`🧭 [App] Calling setPage on PDF ref for page ${page}`);
            pdfRef.current.setPage(page);
          } catch (error: any) {
            console.warn(`⚠️ [App] setPage call failed:`, error?.message);
          }
        }, 100);
      }
    }
    
    showToast(`Jumped to page ${page}`, 'success');
    console.log(`✅ [App] Page state updated to ${page} - navigation triggered`);
  };

  // ============================================
  // FILE SAVING HELPERS
  // ============================================

  /**
   * Get PDF local file path from multiple sources
   * @returns {Promise<string | null>} PDF file path or null if not available
   */
  const getPDFLocalPath = async (): Promise<string | null> => {
    try {
      // Method 1: Get from state (already set by onLoadComplete)
      if (pdfFilePath && pdfFilePath.trim() !== '') {
        console.log('📁 [getPDFLocalPath] Using stored path:', pdfFilePath);
        return pdfFilePath;
      }
      
      // Method 2: Try to get from PDF ref
      if (pdfRef.current?.getPath) {
        const refPath = pdfRef.current.getPath();
        if (refPath && refPath.trim() !== '') {
          console.log('📁 [getPDFLocalPath] Got path from PDF ref:', refPath);
          setPdfFilePath(refPath);
          return refPath;
        }
      }
      
      // Method 3: Try from PDF ref state
      if (pdfRef.current?.state?.path) {
        const refPath = pdfRef.current.state.path;
        if (refPath && refPath.trim() !== '') {
          console.log('📁 [getPDFLocalPath] Got path from PDF ref state:', refPath);
          setPdfFilePath(refPath);
          return refPath;
        }
      }
      
      console.warn('⚠️ [getPDFLocalPath] Could not determine PDF local path');
      return null;
    } catch (error: any) {
      console.error('❌ [getPDFLocalPath] Error getting PDF path:', error);
      return null;
    }
  };

  /**
   * Download exported files to public Downloads folder
   * @param {string | string[]} filePaths - Single file path or array of file paths
   * @returns {Promise<string[]>} Array of downloaded file paths
   */
  const downloadExportedPDFs = async (filePaths: string | string[]): Promise<string[]> => {
    try {
      const { FileDownloader } = NativeModules;
      
      if (!FileDownloader) {
        console.error('❌ [downloadExportedPDFs] FileDownloader module not available');
        throw new Error('FileDownloader module not available');
      }
      
      // Handle single file or array of files
      const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
      const downloadedFiles: string[] = [];
      
      console.log(`📥 [downloadExportedPDFs] Starting download for ${paths.length} file(s)...`);
      
      for (const filePath of paths) {
        if (!filePath || filePath.trim() === '') {
          console.warn('⚠️ [downloadExportedPDFs] Skipping empty file path');
          continue;
        }

        const fileName = filePath.split('/').pop();
        
        if (!fileName) {
          console.warn('⚠️ [downloadExportedPDFs] Could not extract file name from path:', filePath);
          continue;
        }
        
        // Determine MIME type from file extension
        const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                        fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        
        console.log(`📥 [downloadExportedPDFs] Downloading: ${fileName} (${mimeType})`);
        
        try {
          // Use MediaStore API to save file properly
          const publicPath = await FileDownloader.downloadToPublicFolder(
            filePath,
            fileName,
            mimeType
          );
          
          downloadedFiles.push(publicPath);
          console.log(`✅ [downloadExportedPDFs] Downloaded to public storage: ${publicPath}`);
        } catch (error: any) {
          console.error(`❌ [downloadExportedPDFs] Failed to download ${fileName}:`, error);
          // Continue with other files even if one fails
        }
      }
      
      console.log(`✅ [downloadExportedPDFs] All ${downloadedFiles.length} file(s) now visible in Downloads/PDFDemoApp/`);
      return downloadedFiles;
    } catch (error: any) {
      console.error('❌ [downloadExportedPDFs] Download error:', error);
      throw error;
    }
  };

  /**
   * Share exported files with enhanced batch handling
   * @param {string[]} files - Array of file paths to share
   */
  const shareExportedFiles = async (files: string[]) => {
    try {
      if (files.length === 0) {
        Alert.alert('No Files', 'No files available to share');
        return;
      }

      if (files.length === 1) {
        // Share single file directly
        console.log('📤 [shareExportedFiles] Sharing single file:', files[0]);
        await Share.share({
          title: 'Exported PDF',
          message: 'Check out this exported file',
          url: `file://${files[0]}`
        });
      } else {
        // For multiple files, ask user how they want to share
        Alert.alert(
          '📤 Share Files',
          `You have ${files.length} files. How would you like to share them?`,
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: `Share All (${files.length})`,
              onPress: async () => {
                console.log(`📤 [shareExportedFiles] Sharing ${files.length} files sequentially...`);
                for (let i = 0; i < files.length; i++) {
                  try {
                    await Share.share({
                      title: `Exported File ${i + 1}/${files.length}`,
                      message: `File ${i + 1} of ${files.length}`,
                      url: `file://${files[i]}`
                    });
                    // Small delay between shares
                    await new Promise(resolve => setTimeout(resolve, 500));
                  } catch (shareError) {
                    console.log(`⚠️ [shareExportedFiles] User cancelled share for file ${i + 1}`);
                    break; // Stop if user cancels
                  }
                }
                console.log('✅ [shareExportedFiles] Share sequence completed');
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ [shareExportedFiles] Share error:', error);
      Alert.alert('Share Failed', 'Could not share files');
    }
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

      let result: any;
      
      if (options.type === 'single') {
        // Export single page
        const pageNumber = options.page || currentPage;
        // Validate page number
        if (pageNumber < 1 || pageNumber > totalPages) {
          throw new Error(`Invalid page number: ${pageNumber}. Must be between 1 and ${totalPages}`);
        }
        console.log('📤 [App] Exporting single page:', pageNumber);
        // ExportManager expects 1-indexed page number and converts internally
        const imagePath = await exportManager.exportPageToImage(
          pdfFilePath,
          pageNumber, // Pass 1-indexed - ExportManager handles conversion
          {
            format: options.format || 'jpeg',
            quality: options.quality || 0.9,
            scale: 2.0,
          },
        );
        console.log('✅ [App] Page exported successfully:', imagePath);
        
        // Download to public folder
        const downloadedFiles = await downloadExportedPDFs(imagePath);
        console.log('✅ [App] Image downloaded to Downloads/PDFDemoApp/', downloadedFiles);
        
        result = {
          exportedFiles: [imagePath],
          downloadedFiles: downloadedFiles,
          message: `Successfully exported page ${pageNumber}!\n\nSaved to:\nDownloads/PDFDemoApp/`
        };
      } else if (options.type === 'range') {
        // Export range of pages
        const pages = options.pages || [];
        if (pages.length === 0) {
          throw new Error('No pages specified for export');
        }
        console.log('📤 [App] Exporting pages:', pages);
        const images = await exportManager.exportPagesToImages(
          pdfFilePath,
          pages,
          {
            format: options.format || 'jpeg',
            quality: options.quality || 0.9,
            scale: 2.0,
          },
        );
        console.log('✅ [App] Pages exported:', images.length);
        
        // Download to public folder
        const downloadedFiles = await downloadExportedPDFs(images);
        console.log('✅ [App] Images downloaded to Downloads/PDFDemoApp/', downloadedFiles);
        
        result = {
          exportedFiles: images,
          downloadedFiles: downloadedFiles,
          message: `Successfully exported ${images.length} page(s)!\n\nSaved to:\nDownloads/PDFDemoApp/`
        };
      } else if (options.type === 'all') {
        // Export all pages
        console.log('📤 [App] Exporting all pages...');
        const images = await exportManager.exportToImages(pdfFilePath, {
          format: options.format || 'jpeg',
          quality: options.quality || 0.9,
          scale: 2.0,
        });
        console.log('✅ [App] All pages exported:', images.length);
        
        // Download to public folder
        const downloadedFiles = await downloadExportedPDFs(images);
        console.log('✅ [App] Images downloaded to Downloads/PDFDemoApp/', downloadedFiles);
        
        result = {
          exportedFiles: images,
          downloadedFiles: downloadedFiles,
          message: `Successfully exported all ${images.length} pages!\n\nSaved to:\nDownloads/PDFDemoApp/`
        };
      } else if (options.type === 'text') {
        // Export to text
        if (options.page) {
          const pageNumber = options.page;
          // Validate page number
          if (pageNumber < 1 || pageNumber > totalPages) {
            throw new Error(`Invalid page number: ${pageNumber}. Must be between 1 and ${totalPages}`);
          }
          console.log('📤 [App] Exporting page to text:', pageNumber);
          // ExportManager expects 1-indexed page number and converts internally
          const text = await exportManager.exportPageToText(
            pdfFilePath,
            pageNumber, // Pass 1-indexed - ExportManager handles conversion
          );
          console.log('✅ [App] Text exported, length:', text.length);
          result = {
            exportedFiles: [],
            downloadedFiles: [],
            message: `Text exported (${text.length} characters)`,
            text: text,
          };
        } else {
          console.log('📤 [App] Exporting all pages to text...');
          const allText = await exportManager.exportAllToText(pdfFilePath);
          console.log('✅ [App] All text exported, length:', allText.length);
          result = {
            exportedFiles: [],
            downloadedFiles: [],
            message: `All text exported (${allText.length} characters)`,
            text: allText,
          };
        }
      } else {
        throw new Error(`Unknown export type: ${options.type}`);
      }

      if (!result) {
        throw new Error('Export failed - no result returned');
      }

      setShowLoadingOverlay(false);
      
      // Show success alert with options
      if (result.downloadedFiles && result.downloadedFiles.length > 0) {
        // Show alert with Open Folder and Share options for image/PDF exports
        const { FileManager } = NativeModules;
        Alert.alert(
          '✅ Export Successful',
          result.message || 'Export completed successfully!',
          [
            {text: 'Done', style: 'cancel'},
            {
              text: 'Open Folder',
              onPress: async () => {
                try {
                  if (FileManager) {
                    await FileManager.openDownloadsFolder();
                  }
                } catch (e) {
                  Alert.alert('Info', 'Please check Downloads/PDFDemoApp folder in your file manager');
                }
              }
            },
            result.downloadedFiles.length > 0 && {
              text: 'Share',
              onPress: () => shareExportedFiles(result.downloadedFiles),
            },
          ].filter(Boolean)
        );
      } else if (result.text) {
        // For text exports, show share option
        Alert.alert(
          '✅ Export Successful',
          result.message || 'Text exported successfully!',
          [
            {text: 'Done', style: 'cancel'},
            {
              text: 'Share',
              onPress: async () => {
                await Share.share({ message: result.text });
              }
            }
          ]
        );
      } else {
        showToast(result.message || 'Export completed successfully');
      }
      
      console.log('✅ [App] Export completed successfully');
      return result;
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
          // Split PDF - use provided ranges or default to current page split
          // splitPDF expects flat array: [start1, end1, start2, end2, ...]
          let ranges: number[];
          if (options?.ranges && Array.isArray(options.ranges)) {
            // Use provided flat array directly
            ranges = options.ranges;
          } else {
            // Default: split at current page (flat array format)
            ranges = [
              1, currentPage,
              currentPage + 1, totalPages,
            ];
          }
          console.log('⚙️ [App] Splitting PDF with ranges:', ranges);
          const splitPaths = await exportManager.splitPDF(pdfFilePath, ranges);
          console.log('✅ [App] PDF split successfully:', splitPaths);
          
          // Download split PDFs to Downloads folder
          const downloadedSplitFiles = await downloadExportedPDFs(splitPaths);
          const fileCount = Array.isArray(splitPaths) ? splitPaths.length : 0;
          
          result = {
            message: `PDF split into ${fileCount} parts\n\n📥 Files saved to:\nDownloads/PDFDemoApp/\n\n${downloadedSplitFiles.map((f: string) => f.split('/').pop()).join('\n')}`,
            files: downloadedSplitFiles,
          };
          break;

        case 'merge': {
          const { FileManager } = NativeModules;
          let otherPath = options?.url;
          if (otherPath) {
            console.log('⚙️ [App] Merging with URL:', pdfFilePath, otherPath);
          } else {
            console.log('⚙️ [App] Picking a PDF to merge with:', pdfFilePath);
            otherPath = await FileManager.pickPdf();
            console.log('⚙️ [App] Merging PDFs:', pdfFilePath, otherPath);
          }
          const mergedPath = await exportManager.mergePDFs([pdfFilePath, otherPath]);
          console.log('✅ [App] PDFs merged successfully:', mergedPath);
          const downloadedMergeFiles = await downloadExportedPDFs(mergedPath);
          const mergedFileName = downloadedMergeFiles[0]?.split('/').pop();
          result = {
            message: `Merged with the selected PDF\n\n📥 File saved to:\nDownloads/PDFDemoApp/\n\n${mergedFileName}`,
            files: downloadedMergeFiles,
          };
          break;
        }

        case 'extract':
          // Extract pages (use provided pages or current page)
          const pagesToExtract = options?.pages || [currentPage];
          console.log('⚙️ [App] Extracting pages:', pagesToExtract);
          const extractPath = await exportManager.extractPages(
            pdfFilePath,
            pagesToExtract,
          );
          console.log('✅ [App] Pages extracted successfully:', extractPath);
          
          // Download extracted PDF to Downloads folder
          const downloadedExtractFiles = await downloadExportedPDFs(extractPath);
          const fileName = downloadedExtractFiles[0]?.split('/').pop();
          
          result = {
            message: `Extracted ${pagesToExtract.length} page(s)\n\n📥 File saved to:\nDownloads/PDFDemoApp/\n\n${fileName}`,
            files: downloadedExtractFiles,
          };
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
      
      // OperationsMenu component will handle showing success alert
      // Just return the result with message and files
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
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Toolbar */}
        {Toolbar && (
          <Toolbar
            title="PDF Pro Viewer"
            subtitle={`Page ${currentPage}/${totalPages}${totalPages > 0 ? ` • ${jsiAvailable ? '⚡ JSI' : 'Standard'}` : ''}`}
            buttons={[
              {
                icon: '🔖',
                label: 'Add Bookmark',
                onPress: () => {
                  if (!pdfIdentifier && !pdfFilePath) {
                    showToast('Please wait for PDF to load');
                    return;
                  }
                  setShowBookmarkModal(true);
                },
                badge: currentBookmark ? 1 : undefined,
              },
              {
                icon: '📚',
                label: 'All Bookmarks',
                onPress: async () => {
                  await loadBookmarks(); // Refresh bookmarks before showing
                  setShowBookmarkList(true);
                },
                badge: bookmarks.length > 0 ? bookmarks.length : undefined,
              },
              {
                icon: '🖼️',
                label: 'Export',
                onPress: () => {
                  if (!pdfFilePath) {
                    showToast('Please wait for PDF to load');
                  } else {
                    setShowExportMenu(true);
                  }
                },
              },
              {
                icon: '✂️',
                label: 'Operations',
                onPress: () => {
                  if (!pdfFilePath) {
                    showToast('Please wait for PDF to load');
                  } else {
                    setShowOperationsMenu(true);
                  }
                },
              },
              {
                icon: '📊',
                label: 'Analytics',
                onPress: async () => {
                  await loadAnalytics();
                  setShowAnalyticsPanel(true);
                },
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
          
          {/* Bookmark Indicator - Floating button */}
          {BookmarkIndicator && (
            <View style={styles.indicatorContainer}>
              <BookmarkIndicator
                hasBookmark={currentBookmark !== null}
                bookmarkColor={currentBookmark?.color}
                bookmarkCount={bookmarks.length}
                onPress={async () => {
                  await loadBookmarks(); // Refresh bookmarks
                  setShowBookmarkList(true); // Open list modal
                }}
              />
            </View>
          )}
        </View>

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
            onShareFiles={shareExportedFiles}
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
    backgroundColor: '#F5F5F5',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    zIndex: 10,
    alignItems: 'center',
  },
  pdf: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

export default App;