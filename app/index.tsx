import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, SafeAreaView, StyleSheet, ToastAndroid } from 'react-native';
import { WebView } from 'react-native-webview';

const WEBSITE_URL = 'https://zynoflixott.com';

// JavaScript for minimal file handling - no previews, just functional upload
const minimalistFileHandlerJS = `
// Simple file registry 
window.zynoflixActiveFileInputs = window.zynoflixActiveFileInputs || new Map();

// Register file input
function registerFileInput(inputElement) {
    const inputId = inputElement.id || inputElement.name || ('file_input_' + new Date().getTime());
    if (!inputElement.id) {
        inputElement.id = inputId;
    }
    window.zynoflixActiveFileInputs.set(inputId, {
        element: inputElement,
        files: []
    });
    return inputId;
}
`;

// Improved form submission with cleaner approach
const enhancedFormSubmissionJS = `
// Professional form submission handling
function enhanceFormSubmission() {
    // Apply to all forms
    document.querySelectorAll('form:not([data-zynoflix-enhanced])').forEach(form => {
        form.setAttribute('data-zynoflix-enhanced', 'true');
        
        // Direct form submission listener
        form.addEventListener('submit', function(event) {
            // Notify WebView about submission
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'formSubmit',
                data: {
                    action: form.action || window.location.href,
                    method: form.method || 'GET',
                    formId: form.id || '',
                    isSubmitting: true
                }
            }));
        });
    });
}

// Initialize form enhancement
enhanceFormSubmission();

// Watch for dynamic content changes
const observer = new MutationObserver(mutations => {
    let needsEnhancement = false;
    
    for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && 
                    (node.tagName === 'FORM' || 
                     (node.querySelector && node.querySelector('form:not([data-zynoflix-enhanced])')))) {
                    needsEnhancement = true;
                    break;
                }
            }
            if (needsEnhancement) break;
        }
    }
    
    if (needsEnhancement) {
        enhanceFormSubmission();
    }
});

observer.observe(document.body, { 
    childList: true, 
    subtree: true 
});
`;

// Mutex lock mechanism to prevent concurrent picker operations
class PickerLock {
    private locked: boolean = false;
    private queue: Array<() => void> = [];

    async acquire(): Promise<boolean> {
        if (this.locked) {
            return new Promise<boolean>((resolve) => {
                // Add to queue with a timeout to prevent deadlocks
                const timeoutId = setTimeout(() => {
                    // Remove from queue if timeout
                    const index = this.queue.indexOf(onAcquired);
                    if (index !== -1) this.queue.splice(index, 1);
                    resolve(false);
                }, 5000); // 5 second timeout

                const onAcquired = () => {
                    clearTimeout(timeoutId);
                    resolve(true);
                };

                this.queue.push(onAcquired);
            });
        }

        this.locked = true;
        return true;
    }

    release(): void {
        this.locked = false;
        const next = this.queue.shift();
        if (next) next();
    }

    isLocked(): boolean {
        return this.locked;
    }
}

export default function WebViewScreen() {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const pickerLock = useRef(new PickerLock()).current;
    // Keep track of the last active file input
    const lastActiveInputId = useRef<string | null>(null);

    // Handle back button press for Android
    useEffect(() => {
        if (Platform.OS === 'android') {
            const backAction = () => {
                if (webViewRef.current) {
                    webViewRef.current.goBack();
                    return true; // Prevent default behavior
                }
                return false;
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }
    }, []);

    // Request permissions when the component mounts
    useEffect(() => {
        (async () => {
            if (Platform.OS !== 'web') {
                // Request camera permissions
                const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
                if (cameraStatus !== 'granted') {
                    Alert.alert('Permission needed', 'Camera access is required to upload photos directly.');
                }

                // Request media library permissions
                const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (mediaLibraryStatus !== 'granted') {
                    Alert.alert('Permission needed', 'Media library access is required to select photos or videos.');
                }
            }
        })();
    }, []);

    // Convert file URI to base64
    const fileToBase64 = async (uri: string): Promise<string> => {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            return base64;
        } catch (error) {
            console.error('Error converting file to base64:', error);
            throw error;
        }
    };

    // Process file with standardized approach
    const processFile = async (uri: string, name: string, mimeType: string): Promise<{ name: string, type: string, base64: string }> => {
        try {
            const base64Data = await fileToBase64(uri);
            return {
                name: name,
                type: mimeType,
                base64: base64Data
            };
        } catch (error) {
            console.error('Error processing file:', error);
            throw error;
        }
    };

    // Get mime type from file extension
    const getMimeType = (filename: string): string => {
        const extension = filename.split('.').pop()?.toLowerCase() || '';

        const mimeTypes: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'mkv': 'video/x-matroska',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt': 'application/vnd.ms-powerpoint',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'txt': 'text/plain',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed'
        };

        return mimeTypes[extension] || 'application/octet-stream';
    };

    // Handle form submission directly
    const handleFormSubmission = (formAction: string, formMethod: string, isSignup: boolean) => {
        if (isSignup) {
            console.log('Handling signup form submission');

            // Inject code to help with signup form submission
            const signupFormHelperJS = `
                (function() {
                    console.log('Assisting with signup form submission');
                    
                    // Ensure form submission completes properly
                    try {
                        // If there are errors displayed on the page, show them
                        const errorElements = document.querySelectorAll('.error, .alert-danger, .invalid-feedback, [role="alert"]');
                        if (errorElements.length > 0) {
                            console.error('Form submission errors found:', Array.from(errorElements).map(el => el.textContent));
                        }
                        
                        // If there's a submit button that needs to be clicked, click it
                        const pendingSubmitBtn = document.querySelector('form button[type="submit"]:not(:disabled), form input[type="submit"]:not(:disabled)');
                        if (pendingSubmitBtn) {
                            console.log('Clicking pending submit button');
                            pendingSubmitBtn.click();
                        }
                    } catch (error) {
                        console.error('Error assisting form submission:', error);
                    }
                })();
                true;
            `;

            webViewRef.current?.injectJavaScript(signupFormHelperJS);
        }
    };

    // Handle form errors
    const handleFormError = (errors: string[]) => {
        if (errors.length > 0) {
            // Show error to user
            const errorMessage = errors.join('\n');
            Alert.alert('Form Submission Error', errorMessage);
        }
    };

    // Handle file selection
    const handleFileSelection = async (accept: string, multiple: boolean, targetId: string) => {
        if (pickerLock.isLocked()) {
            return false;
        }

        const lockAcquired = await pickerLock.acquire();
        if (!lockAcquired) return false;

        try {
            if (Platform.OS === 'android') {
                ToastAndroid.show('Selecting file...', ToastAndroid.SHORT);
            }

            lastActiveInputId.current = targetId;

            // Optimize picker selection based on file type
            let result;

            if (accept?.includes('image')) {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: !multiple,
                    quality: 0.7,
                    allowsMultipleSelection: multiple
                });
            } else if (accept?.includes('video')) {
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                    allowsMultipleSelection: multiple
                });
            } else {
                result = await DocumentPicker.getDocumentAsync({
                    type: accept || '*/*',
                    multiple
                });
            }

            if (result.canceled || !result.assets || result.assets.length === 0) {
                pickerLock.release();
                return false;
            }

            if (Platform.OS === 'android') {
                ToastAndroid.show('Processing files...', ToastAndroid.SHORT);
            }

            // Process files with optimized parallel processing
            const processedFiles = await Promise.all(
                result.assets.map(async (asset: any) => {
                    try {
                        const uri = asset.uri;
                        const fileName = asset.fileName || asset.name || `file_${Date.now()}`;
                        const mimeType = asset.mimeType || getMimeType(fileName);
                        return await processFile(uri, fileName, mimeType);
                    } catch (error) {
                        return null;
                    }
                })
            );

            const validFiles = processedFiles.filter(file => file !== null);

            if (validFiles.length === 0) {
                Alert.alert('Error', 'Failed to process selected files.');
                pickerLock.release();
                return false;
            }

            if (Platform.OS === 'android') {
                ToastAndroid.show('Uploading files...', ToastAndroid.SHORT);
            }

            // Optimized JS code injection with minimal memory usage - no previews
            const jsCode = `
                // Reuse minimal functions
                // ${minimalistFileHandlerJS}
                
                (function() {
                    try {
                        // Find target file input efficiently
                        const fileInput = document.getElementById('${targetId}') || 
                                        document.querySelector('input[type="file"]:last-of-type');
                        
                        if (!fileInput) throw new Error('No file input found');
                        
                        // Create and add files efficiently
                        const dataTransfer = new DataTransfer();
                        
                        // Process files with minimal variable creation
                        ${validFiles.map((file, index) => `
                            try {
                                // Convert base64 to binary efficiently
                                const binary${index} = atob('${file.base64}');
                                const bytes${index} = new Uint8Array(binary${index}.length);
                                for (let i = 0; i < binary${index}.length; i++) bytes${index}[i] = binary${index}.charCodeAt(i);
                                
                                // Create blob and file
                                const blob${index} = new Blob([bytes${index}.buffer], {type:'${file.type}'});
                                dataTransfer.items.add(new File([blob${index}], '${file.name}', {type:'${file.type}'}));
                            } catch(e) {}
                        `).join('')}
                        
                        // Set files and trigger events
                        fileInput.files = dataTransfer.files;
                        fileInput.classList.add('has-files');
                        fileInput.dispatchEvent(new Event('change', {bubbles:true}));
                        
                        // Register ID for future reference
                        registerFileInput(fileInput);
                        
                        // Find parent form and submit button for auto-submission
                        const form = fileInput.closest('form');
                        const submitButton = form ? 
                            (form.querySelector('button[type="submit"]') || form.querySelector('input[type="submit"]')) : 
                            null;
                        
                        // Show minimal toast notification
                        const toast = document.createElement('div');
                        toast.textContent = '${validFiles.length} file${validFiles.length > 1 ? 's' : ''} attached';
                        toast.style.cssText = 'position:fixed;bottom:15px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:8px 16px;border-radius:4px;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.3s';
                        document.body.appendChild(toast);
                        
                        // Fade in and out animation
                        setTimeout(() => {
                            toast.style.opacity = '0.9';
                            setTimeout(() => {
                                toast.style.opacity = '0';
                                setTimeout(() => toast.remove(), 300);
                            }, 2000);
                        }, 10);
                        
                        // Auto submit upload-only forms
                        if (form && submitButton) {
                            const otherInputs = form.querySelectorAll('input:not([type="file"]):not([type="submit"]):not([type="hidden"])');
                            if (otherInputs.length === 0) {
                                setTimeout(() => submitButton.click(), 800);
                            }
                        }
                    } catch (error) {
                        console.error('Error in file handling:', error);
                    }
                })();
                true;
            `;

            // webViewRef.current?.injectJavaScript(jsCode);

            if (Platform.OS === 'android') {
                ToastAndroid.show('Files attached successfully!', ToastAndroid.SHORT);
            }

            pickerLock.release();
            return true;
        } catch (error) {
            console.error('Error selecting file:', error);
            Alert.alert('Error', 'Failed to select file. Please try again.');
            pickerLock.release();
            return false;
        }
    };

    // Handle file input request with unified approach
    const handleFileInputRequest = async (data: string) => {
        if (pickerLock.isLocked()) {
            if (Platform.OS === 'android') {
                ToastAndroid.show('Another file selection is in progress', ToastAndroid.SHORT);
            }
            console.log('File picker already active. Ignoring request.');
            return;
        }

        try {
            const requestData = JSON.parse(data);
            const { type, accept, multiple, id } = requestData;

            // Use a unified file handling approach
            await handleFileSelection(accept || type, multiple, id);
        } catch (error) {
            console.error('Error handling file input request:', error);
            Alert.alert('Error', 'Failed to select file. Please try again.');
            // Ensure lock is released in case of error
            if (pickerLock.isLocked()) {
                pickerLock.release();
            }
        }
    };

    // Observe DOM for file inputs and clicks
    const observeDomForFileInputs = `
    (function() {
        // Initialize tracking system
        window.zynoflixActiveFileInputs = window.zynoflixActiveFileInputs || new Map();
        
        // Debounce function
        function debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
        
        // Register a file input
        function registerFileInput(input) {
            if (!input.id) {
                input.id = 'zynoflix_file_' + Date.now();
            }
            
            window.zynoflixActiveFileInputs.set(input.id, {
                element: input
            });
            
            return input.id;
        }
        
        // File input click handler
        document.addEventListener('click', function(event) {
            if (event.target.tagName === 'INPUT' && event.target.type === 'file') {
                // Prevent default file dialog
                event.preventDefault();
                
                // Ensure input is registered
                const inputId = registerFileInput(event.target);
                
                // Send message to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'fileInputClick',
                    data: {
                        id: inputId,
                        accept: event.target.accept || '*/*',
                        multiple: !!event.target.multiple
                    }
                }));
            }
        }, true);
        
        // Submit button handler - capture all form submissions
        document.addEventListener('click', function(event) {
            if ((event.target.tagName === 'BUTTON' && event.target.type === 'submit') || 
                (event.target.tagName === 'INPUT' && event.target.type === 'submit')) {
                
                const form = event.target.closest('form');
                if (form) {
                    // Let React Native know about the form submission
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'formSubmit',
                        data: {
                            action: form.action || window.location.href,
                            method: form.method || 'GET',
                            formId: form.id || ''
                        }
                    }));
                }
            }
        }, true);
        
        // Dynamically added file inputs observer
        const observer = new MutationObserver(function(mutations) {
            const fileInputs = [];
            
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            // Direct file inputs
                            if (node.tagName === 'INPUT' && node.type === 'file') {
                                fileInputs.push(node);
                            }
                            // Nested file inputs
                            else if (node.querySelectorAll) {
                                node.querySelectorAll('input[type="file"]').forEach(input => {
                                    fileInputs.push(input);
                                });
                            }
                        }
                    });
                }
            });
            
            // Register all found file inputs
            fileInputs.forEach(input => registerFileInput(input));
        });
        
        // Initial scan for file inputs
        document.querySelectorAll('input[type="file"]').forEach(input => {
            registerFileInput(input);
        });
        
        // Start observing
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
    })();
    true;
    `;

    const handleMessage = (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);

            switch (message.type) {
                case 'fileInputClick':
                    handleFileInputRequest(JSON.stringify(message.data));
                    break;

                case 'formSubmit':
                    const { action, method, isSignup } = message.data;
                    handleFormSubmission(action, method, isSignup);
                    break;

                case 'formError':
                    const { errors } = message.data;
                    handleFormError(errors);
                    break;

                case 'formSuccess':
                    const { message: successMessage } = message.data;
                    handleFormSuccess(successMessage);
                    break;

                default:
                    console.log('Unhandled message type:', message.type);
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
        }
    };

    // Inject custom script when WebView is loaded
    const handleWebViewLoad = () => {
        setIsLoading(false);

        // // Professional form handling with cleaner approach
        // const professionalFormHandlerJS = `
        // (function() {
        //     // Add loading styles
        //     if (!document.getElementById('zf-styles')) {
        //         const style = document.createElement('style');
        //         style.id = 'zf-styles';
        //         style.textContent = '.zf-loading{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;transition:opacity 0.3s}.zf-spinner{width:40px;height:40px;border:3px solid rgba(255,255,255,0.3);border-top:3px solid #fff;border-radius:50%;animation:zf-spin 1s linear infinite;margin-bottom:12px}.zf-text{font-size:16px;font-weight:500;text-align:center;max-width:80%}@keyframes zf-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
        //         document.head.appendChild(style);
        //     }

        //     // App state management
        //     const app = {
        //         formSubmitting: false,
        //         loader: null,
        //         show: function(message) {
        //             this.hide();
        //             const loader = document.createElement('div');
        //             loader.className = 'zf-loading';

        //             const spinner = document.createElement('div');
        //             spinner.className = 'zf-spinner';

        //             const text = document.createElement('div');
        //             text.className = 'zf-text';
        //             text.textContent = message || 'Processing...';

        //             loader.appendChild(spinner);
        //             loader.appendChild(text);
        //             document.body.appendChild(loader);
        //             this.loader = loader;
        //         },
        //         hide: function() {
        //             if (this.loader) {
        //                 this.loader.style.opacity = '0';
        //                 setTimeout(() => {
        //                     if (this.loader && this.loader.parentNode) {
        //                         this.loader.parentNode.removeChild(this.loader);
        //                         this.loader = null;
        //                     }
        //                 }, 300);
        //             }
        //         }
        //     };

        //     // Form submission handling
        //     function setupFormHandling() {
        //         // Store current URL
        //         let currentUrl = location.href;

        //         // Handle all forms with event delegation
        //         document.addEventListener('submit', function(e) {
        //             if (e.target.tagName === 'FORM') {
        //                 // Prevent double submissions
        //                 if (app.formSubmitting) {
        //                     e.preventDefault();
        //                     return;
        //                 }

        //                 app.formSubmitting = true;
        //                 app.show('Submitting form...');

        //                 // Update UI for submit buttons
        //                 const buttons = e.target.querySelectorAll('button[type="submit"], input[type="submit"]');
        //                 buttons.forEach(btn => {
        //                     btn.disabled = true;
        //                     btn.style.opacity = '0.7';
        //                     btn.dataset.originalText = btn.tagName === 'BUTTON' ? btn.innerHTML : btn.value;
        //                     if (btn.tagName === 'BUTTON') {
        //                         btn.innerHTML = '<span>Please wait...</span>';
        //                     } else {
        //                         btn.value = 'Please wait...';
        //                     }
        //                 });

        //                 // Handle form submission - check for completion
        //                 const checkFormStatus = () => {
        //                     // Check for URL change (success case)
        //                     if (currentUrl !== location.href) {
        //                         currentUrl = location.href;
        //                         window.ReactNativeWebView.postMessage(JSON.stringify({
        //                             type: 'formSuccess',
        //                             data: { newUrl: location.href }
        //                         }));
        //                         return;
        //                     }

        //                     // Check for errors
        //                     const errorElements = document.querySelectorAll('.error, .alert-danger, .invalid-feedback, [role="alert"]');
        //                     if (errorElements.length > 0) {
        //                         app.hide();
        //                         app.formSubmitting = false;

        //                         // Restore buttons
        //                         buttons.forEach(btn => {
        //                             btn.disabled = false;
        //                             btn.style.opacity = '1';
        //                             if (btn.tagName === 'BUTTON' && btn.dataset.originalText) {
        //                                 btn.innerHTML = btn.dataset.originalText;
        //                             } else if (btn.dataset.originalText) {
        //                                 btn.value = btn.dataset.originalText;
        //                             }
        //                         });

        //                         // Report errors
        //                         window.ReactNativeWebView.postMessage(JSON.stringify({
        //                             type: 'formError',
        //                             data: { 
        //                                 errors: Array.from(errorElements).map(el => el.textContent.trim()),
        //                                 formId: e.target.id || ''
        //                             }
        //                         }));
        //                     }
        //                 };

        //                 // Start monitoring with intervals
        //                 const checkInterval = setInterval(() => {
        //                     if (currentUrl !== location.href) {
        //                         // Success - URL changed
        //                         clearInterval(checkInterval);
        //                         app.formSubmitting = false;
        //                         setTimeout(() => app.hide(), 500); // Allow time for navigation
        //                     } else if (!app.formSubmitting) {
        //                         // Form was already processed
        //                         clearInterval(checkInterval);
        //                     } else {
        //                         // Keep checking for a reasonable time
        //                         checkFormStatus();
        //                     }
        //                 }, 300);

        //                 // Set a timeout to stop checking
        //                 setTimeout(() => {
        //                     clearInterval(checkInterval);
        //                     if (app.formSubmitting) {
        //                         app.formSubmitting = false;
        //                         app.hide();

        //                         // Restore buttons
        //                         buttons.forEach(btn => {
        //                             btn.disabled = false;
        //                             btn.style.opacity = '1';
        //                             if (btn.tagName === 'BUTTON' && btn.dataset.originalText) {
        //                                 btn.innerHTML = btn.dataset.originalText;
        //                             } else if (btn.dataset.originalText) {
        //                                 btn.value = btn.dataset.originalText;
        //                             }
        //                         });
        //                     }
        //                 }, 15000); // 15 seconds timeout
        //             }
        //         }, true);

        //         // Handle navigation events
        //         window.addEventListener('beforeunload', function() {
        //             if (app.formSubmitting) {
        //                 app.show('Navigating...');
        //             }
        //         });

        //         window.addEventListener('pageshow', function() {
        //             app.formSubmitting = false;
        //             app.hide();
        //             currentUrl = location.href;
        //         });
        //     }

        //     // Handle direct submit button clicks
        //     document.addEventListener('click', function(e) {
        //         if ((e.target.tagName === 'BUTTON' && e.target.type === 'submit') || 
        //             (e.target.tagName === 'INPUT' && e.target.type === 'submit')) {
        //             if (!app.formSubmitting) {
        //                 e.target.style.opacity = '0.8';
        //             }
        //         }
        //     }, true);

        //     // Initialize
        //     setupFormHandling();

        //     // Set webview flag cookie to help with backend detection
        //     document.cookie = "webview=true; path=/;";
        // })();
        // true;
        // `;

        // webViewRef.current?.injectJavaScript(professionalFormHandlerJS);
    };

    // Handle form success with navigation feedback
    const handleFormSuccess = (message: string) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.LONG);
        } else {
            Alert.alert('Success', message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="auto" />
            <WebView
                ref={webViewRef}
                source={{ uri: WEBSITE_URL }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={handleWebViewLoad}
                // injectedJavaScript={observeDomForFileInputs}
                onMessage={handleMessage}
                allowsFullscreenVideo={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                cacheEnabled={true}
                pullToRefreshEnabled={true}
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
                incognito={false}
                applicationNameForUserAgent="ZynoflixApp"
                textZoom={100}
                scrollEnabled={true}
                useSharedProcessPool={true}
                cacheMode="LOAD_CACHE_ELSE_NETWORK"
                originWhitelist={['*']}
                decelerationRate={0.998}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    webView: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5FCFF88',
        zIndex: 1,
    },
}); 