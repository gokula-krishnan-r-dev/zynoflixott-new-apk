import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, StyleSheet, ToastAndroid, View } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const WEBSITE_URL = 'https://zynoflixott.com';


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
    // Track video fullscreen state
    const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
    const [statusBarHidden, setStatusBarHidden] = useState(false);
    // Reference to fullscreen timeout
    const fullscreenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Handle fullscreen state changes
    const handleFullscreenChange = async (isFullscreen: boolean) => {
        setIsVideoFullscreen(isFullscreen);
        setStatusBarHidden(isFullscreen);

        // Clear any existing timeout
        if (fullscreenTimeoutRef.current) {
            clearTimeout(fullscreenTimeoutRef.current);
            fullscreenTimeoutRef.current = null;
        }

        try {
            if (isFullscreen) {
                // Lock to landscape orientation when entering fullscreen
                await ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.LANDSCAPE
                );

                // Safety timeout - if we don't get an exit fullscreen event after 5 minutes
                // go back to default orientation (in case user exited fullscreen via OS controls)
                fullscreenTimeoutRef.current = setTimeout(async () => {
                    const orientation = await ScreenOrientation.getOrientationAsync();
                    const isLandscape = orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
                        orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;

                    // Only change if still in landscape (meaning we probably missed the exit event)
                    if (isLandscape) {
                        await ScreenOrientation.lockAsync(
                            ScreenOrientation.OrientationLock.DEFAULT
                        );
                        setStatusBarHidden(false);
                        setIsVideoFullscreen(false);
                    }
                }, 5 * 60 * 1000); // 5 minutes
            } else {
                // Return to default orientation when exiting fullscreen
                await ScreenOrientation.lockAsync(
                    ScreenOrientation.OrientationLock.DEFAULT
                );
            }
        } catch (error) {
            console.error('Error changing screen orientation:', error);
        }
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            // Unlock orientation when component unmounts
            ScreenOrientation.unlockAsync();

            // Clear any timeouts
            if (fullscreenTimeoutRef.current) {
                clearTimeout(fullscreenTimeoutRef.current);
            }
        };
    }, []);

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

                case 'videoFullscreenChange':
                    handleFullscreenChange(message.data.isFullscreen);
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

        // Inject script to detect fullscreen changes
        const fullscreenDetectionScript = `
        (function() {
            // Track fullscreen state
            let isInFullscreen = false;
            
            // Function to detect fullscreen changes
            function detectFullscreenChange() {
                const isFullscreen = !!(
                    document.fullscreenElement || 
                    document.webkitFullscreenElement ||
                    document.mozFullScreenElement ||
                    document.msFullscreenElement
                );
                
                // Only send message if state changed
                if (isFullscreen !== isInFullscreen) {
                    isInFullscreen = isFullscreen;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'videoFullscreenChange',
                        data: { isFullscreen }
                    }));
                }
            }
            
            // Listen for fullscreen events
            document.addEventListener('fullscreenchange', detectFullscreenChange);
            document.addEventListener('webkitfullscreenchange', detectFullscreenChange);
            document.addEventListener('mozfullscreenchange', detectFullscreenChange);
            document.addEventListener('MSFullscreenChange', detectFullscreenChange);
            
            // Enhanced video element handling
            function enhanceVideoElements() {
                const videos = document.querySelectorAll('video');
                videos.forEach(video => {
                    if (!video.hasFullscreenListener) {
                        video.hasFullscreenListener = true;
                        
                        // Listen for entering fullscreen via HTML5 video API
                        video.addEventListener('webkitbeginfullscreen', () => {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'videoFullscreenChange',
                                data: { isFullscreen: true }
                            }));
                        });
                        
                        // Listen for exiting fullscreen via HTML5 video API
                        video.addEventListener('webkitendfullscreen', () => {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'videoFullscreenChange',
                                data: { isFullscreen: false }
                            }));
                        });
                        
                        // Add fullscreen change events for iOS
                        video.addEventListener('enterpictureinpicture', () => {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'videoFullscreenChange',
                                data: { isFullscreen: true }
                            }));
                        });
                        
                        video.addEventListener('leavepictureinpicture', () => {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'videoFullscreenChange',
                                data: { isFullscreen: false }
                            }));
                        });
                    }
                });
            }
            
            // Handle common video player frameworks
            function detectVideoPlayers() {
                // YouTube embeds
                const ytPlayers = document.querySelectorAll('.ytp-fullscreen-button, .youtube-player');
                ytPlayers.forEach(btn => {
                    if (!btn.hasClickListener) {
                        btn.hasClickListener = true;
                        btn.addEventListener('click', () => {
                            // Small delay to ensure fullscreen state has changed
                            setTimeout(detectFullscreenChange, 300);
                        });
                    }
                });
                
                // JW Player
                const jwPlayers = document.querySelectorAll('.jwplayer');
                jwPlayers.forEach(player => {
                    if (!player.hasFullscreenObserver) {
                        player.hasFullscreenObserver = true;
                        const observer = new MutationObserver(() => {
                            const isFullscreen = player.classList.contains('jwplayer-fullscreen') || 
                                                player.classList.contains('jw-flag-fullscreen');
                            if (isFullscreen !== isInFullscreen) {
                                isInFullscreen = isFullscreen;
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'videoFullscreenChange',
                                    data: { isFullscreen }
                                }));
                            }
                        });
                        observer.observe(player, { attributes: true, attributeFilter: ['class'] });
                    }
                });
                
                // Vimeo
                const vimeoPlayers = document.querySelectorAll('.vimeo-player, .vp-player-layout');
                vimeoPlayers.forEach(player => {
                    if (!player.hasFullscreenObserver) {
                        player.hasFullscreenObserver = true;
                        const observer = new MutationObserver(() => {
                            const isFullscreen = player.classList.contains('in-fullscreen') || 
                                                document.querySelector('.vp-full-screen');
                            if (isFullscreen !== isInFullscreen) {
                                isInFullscreen = isFullscreen;
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'videoFullscreenChange',
                                    data: { isFullscreen }
                                }));
                            }
                        });
                        observer.observe(player, { attributes: true, attributeFilter: ['class'] });
                    }
                });
            }
            
            // Initial enhancement
            enhanceVideoElements();
            detectVideoPlayers();
            
            // Continue to check for new video elements (for dynamically loaded content)
            const observer = new MutationObserver(() => {
                enhanceVideoElements();
                detectVideoPlayers();
            });
            
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
            
            // Handle fullscreen buttons directly
            document.addEventListener('click', event => {
                const target = event.target;
                if (target && (
                    target.classList.contains('fullscreen-button') || 
                    target.closest('.fullscreen-button') ||
                    target.classList.contains('vjs-fullscreen-control') ||
                    target.getAttribute('title')?.toLowerCase().includes('fullscreen') ||
                    target.getAttribute('aria-label')?.toLowerCase().includes('fullscreen')
                )) {
                    // Wait a moment for fullscreen to take effect
                    setTimeout(detectFullscreenChange, 300);
                }
            }, true);
        })();
        true;
        `;

        webViewRef.current?.injectJavaScript(fullscreenDetectionScript);
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
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <WebViewContainer
                webViewRef={webViewRef}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                handleWebViewLoad={handleWebViewLoad}
                handleMessage={handleMessage}
                isVideoFullscreen={isVideoFullscreen}
                statusBarHidden={statusBarHidden}
            />
        </SafeAreaProvider>
    );
}

// Separate component to access insets
function WebViewContainer({
    webViewRef,
    isLoading,
    setIsLoading,
    handleWebViewLoad,
    handleMessage,
    isVideoFullscreen,
    statusBarHidden
}: {
    webViewRef: React.RefObject<WebView | null>,
    isLoading: boolean,
    setIsLoading: (loading: boolean) => void,
    handleWebViewLoad: () => void,
    handleMessage: (event: any) => void,
    isVideoFullscreen: boolean,
    statusBarHidden: boolean
}) {
    const insets = useSafeAreaInsets();

    // Dynamically adjust safe area based on fullscreen status
    const containerStyle = {
        ...styles.container,
        // When in fullscreen video mode, ignore safe areas to use full screen
        paddingTop: isVideoFullscreen ? 0 : insets.top,
        paddingBottom: isVideoFullscreen ? 0 : insets.bottom,
        paddingLeft: isVideoFullscreen ? 0 : insets.left,
        paddingRight: isVideoFullscreen ? 0 : insets.right,
    };

    return (
        <View style={containerStyle}>
            <StatusBar style="auto" hidden={statusBarHidden} />
            <WebView
                ref={webViewRef}
                source={{ uri: WEBSITE_URL }}
                style={styles.webView}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={handleWebViewLoad}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2c1157',
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