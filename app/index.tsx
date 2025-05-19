import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, SafeAreaView, StyleSheet, ToastAndroid } from 'react-native';
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

    // Handle file selection
    const handleFileSelection = async (accept: string, multiple: boolean, targetId: string) => {
        if (pickerLock.isLocked()) {
            console.log('Picker already in use, cannot select file');
            return false;
        }

        const lockAcquired = await pickerLock.acquire();
        if (!lockAcquired) {
            console.log('Failed to acquire lock for file selection');
            return false;
        }

        try {
            if (Platform.OS === 'android') {
                ToastAndroid.show('Selecting file...', ToastAndroid.SHORT);
            }

            let result;
            const isImageAccept = accept?.includes('image');
            const isVideoAccept = accept?.includes('video');

            if (isImageAccept) {
                // Use image picker for images
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: !multiple,
                    quality: 0.8,
                    allowsMultipleSelection: multiple
                });
            } else if (isVideoAccept) {
                // Use image picker for videos
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                    allowsMultipleSelection: multiple
                });
            } else {
                // Use document picker for other files
                result = await DocumentPicker.getDocumentAsync({
                    type: accept || '*/*',
                    multiple
                });
            }

            if (!result.canceled && result.assets.length > 0) {
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Processing files...', ToastAndroid.SHORT);
                }

                // Process all files in a consistent way
                const processedFiles = await Promise.all(
                    result.assets.map(async (asset: any) => {
                        try {
                            // Standardize file information
                            const uri = asset.uri;
                            const fileName = asset.fileName || asset.name || `file_${Date.now()}`;
                            const mimeType = asset.mimeType || getMimeType(fileName);

                            // Process each file
                            return await processFile(uri, fileName, mimeType);
                        } catch (error) {
                            console.error('Error processing asset:', error);
                            return null;
                        }
                    })
                );

                // Filter out any files that failed to process
                const validFiles = processedFiles.filter(file => file !== null);

                if (validFiles.length === 0) {
                    Alert.alert('Error', 'Failed to process selected files.');
                    pickerLock.release();
                    return false;
                }

                if (Platform.OS === 'android') {
                    ToastAndroid.show('Uploading files...', ToastAndroid.SHORT);
                }

                // Check if we're dealing with image or video
                const isImageOrVideo = validFiles.some(file =>
                    file.type.startsWith('image/') || file.type.startsWith('video/')
                );

                // Create JavaScript to inject the files into the website's file input
                const jsCode = `
                    (function() {
                        try {
                            // Find the target file input
                            let fileInput = document.getElementById('${targetId}');
                            
                            // If we can't find the input by ID, find the most recently used file input
                            if (!fileInput) {
                                const inputs = document.querySelectorAll('input[type="file"]');
                                if (inputs.length > 0) {
                                    fileInput = inputs[inputs.length - 1];
                                } else {
                                    throw new Error('No file input found');
                                }
                            }
                            
                            // Create files from base64 data
                            const fileArray = [];
                            const previewUrls = []; // Store blob URLs for preview
                            
                            ${validFiles.map((file, index) => `
                                // Process file ${index}
                                try {
                                    const binaryString${index} = atob('${file.base64}');
                                    const bytes${index} = new Uint8Array(binaryString${index}.length);
                                    for (let i = 0; i < binaryString${index}.length; i++) {
                                        bytes${index}[i] = binaryString${index}.charCodeAt(i);
                                    }
                                    const blob${index} = new Blob([bytes${index}.buffer], { type: '${file.type}' });
                                    const file${index} = new File([blob${index}], "${file.name}", { type: '${file.type}' });
                                    fileArray.push(file${index});
                                    
                                    // Create a URL for preview
                                    const url${index} = URL.createObjectURL(blob${index});
                                    previewUrls.push({url: url${index}, type: '${file.type}', name: '${file.name}'});
                                    
                                    console.log('Processed file ${index}: ${file.name}');
                                } catch(fileError) {
                                    console.error('Error processing file ${index}:', fileError);
                                }
                            `).join('')}
                            
                            console.log('Total processed files:', fileArray.length);
                            
                            // Create a DataTransfer object and add files
                            try {
                                const dataTransfer = new DataTransfer();
                                fileArray.forEach(file => dataTransfer.items.add(file));
                                
                                // Assign the files to the input and trigger change event
                                fileInput.files = dataTransfer.files;
                                
                                // Add a class to mark this input as having files
                                fileInput.classList.add('has-files');
                                
                                // Try to find parent form
                                const form = fileInput.closest('form');
                                if (form) {
                                    console.log('Found parent form:', form);
                                }
                                
                                // Trigger events on the input
                                ['change', 'input'].forEach(eventType => {
                                    const event = new Event(eventType, { bubbles: true });
                                    fileInput.dispatchEvent(event);
                                });
                                
                                // Find submit button
                                let submitButton = null;
                                if (form) {
                                    submitButton = form.querySelector('button[type="submit"]');
                                    if (!submitButton) {
                                        submitButton = form.querySelector('input[type="submit"]');
                                    }
                                }
                                
                                // For images and videos, create a preview
                                if (${isImageOrVideo}) {
                                    // Find the preview container - look for common patterns
                                    let previewContainer = null;
                                    
                                    // First try to find the thumbnail or preview element
                                    const possiblePreviews = [
                                        document.querySelector('.thumbnail'),
                                        document.querySelector('.preview'),
                                        document.querySelector('[class*="preview"]'),
                                        document.querySelector('[class*="thumbnail"]'),
                                        document.querySelector('[id*="preview"]'),
                                        document.querySelector('[id*="thumbnail"]'),
                                        document.querySelector('.image-preview'),
                                        document.querySelector('.file-preview'),
                                        // Look for elements near the file input
                                        fileInput.parentElement,
                                        fileInput.parentElement?.parentElement
                                    ];
                                    
                                    // Try to find a valid preview container
                                    for (const element of possiblePreviews) {
                                        if (element) {
                                            previewContainer = element;
                                            break;
                                        }
                                    }
                                    
                                    // If no container found, create one
                                    if (!previewContainer) {
                                        previewContainer = document.createElement('div');
                                        previewContainer.className = 'dynamic-preview-container';
                                        previewContainer.style.width = '100%';
                                        previewContainer.style.marginTop = '10px';
                                        previewContainer.style.marginBottom = '10px';
                                        previewContainer.style.padding = '10px';
                                        previewContainer.style.border = '1px solid #ccc';
                                        previewContainer.style.borderRadius = '5px';
                                        
                                        // Insert after the file input
                                        if (fileInput.parentElement) {
                                            fileInput.parentElement.insertBefore(previewContainer, fileInput.nextSibling);
                                        } else {
                                            document.body.appendChild(previewContainer);
                                        }
                                    }
                                    
                                    // Clear previous previews
                                    if (previewContainer.querySelector('.dynamic-preview')) {
                                        const oldPreviews = previewContainer.querySelectorAll('.dynamic-preview');
                                        oldPreviews.forEach(preview => preview.remove());
                                    }
                                    
                                    // Create preview elements
                                    previewUrls.forEach(item => {
                                        const previewItem = document.createElement('div');
                                        previewItem.className = 'dynamic-preview';
                                        previewItem.style.marginBottom = '10px';
                                        
                                        if (item.type.startsWith('image/')) {
                                            // Image preview
                                            const img = document.createElement('img');
                                            img.src = item.url;
                                            img.style.maxWidth = '100%';
                                            img.style.maxHeight = '300px';
                                            img.style.objectFit = 'contain';
                                            previewItem.appendChild(img);
                                        } else if (item.type.startsWith('video/')) {
                                            // Video preview
                                            const video = document.createElement('video');
                                            video.src = item.url;
                                            video.controls = true;
                                            video.autoplay = false;
                                            video.style.maxWidth = '100%';
                                            video.style.maxHeight = '300px';
                                            previewItem.appendChild(video);
                                        }
                                        
                                        // Add filename
                                        const filename = document.createElement('div');
                                        filename.textContent = item.name;
                                        filename.style.fontSize = '12px';
                                        filename.style.marginTop = '5px';
                                        previewItem.appendChild(filename);
                                        
                                        previewContainer.appendChild(previewItem);
                                    });
                                    
                                    // If we have a submit button, show file is ready to upload
                                    if (submitButton) {
                                        submitButton.style.backgroundColor = '#4CAF50';
                                        submitButton.style.color = 'white';
                                    }
                                }
                                
                                console.log('Successfully attached', fileArray.length, 'files to input');
                                
                                // Show message on webpage
                                const message = document.createElement('div');
                                message.style.position = 'fixed';
                                message.style.bottom = '20px';
                                message.style.left = '0';
                                message.style.right = '0';
                                message.style.backgroundColor = 'rgba(0,0,0,0.7)';
                                message.style.color = 'white';
                                message.style.padding = '10px';
                                message.style.textAlign = 'center';
                                message.style.zIndex = '9999';
                                message.textContent = 'Files attached successfully. You can now submit the form.';
                                document.body.appendChild(message);
                                
                                // Remove the message after 5 seconds
                                setTimeout(() => {
                                    if (document.body.contains(message)) {
                                        document.body.removeChild(message);
                                    }
                                }, 5000);
                                
                                // Auto submit if this is an upload-only form (no other inputs)
                                if (form) {
                                    const otherInputs = form.querySelectorAll('input:not([type="file"]):not([type="submit"]):not([type="hidden"])');
                                    const isUploadOnlyForm = otherInputs.length === 0;
                                    
                                    if (isUploadOnlyForm && submitButton) {
                                        // Simulate click on submit button after a short delay
                                        setTimeout(() => {
                                            submitButton.click();
                                        }, 1000);
                                    }
                                }
                            } catch(e) {
                                console.error('Error setting up file transfer:', e);
                            }
                        } catch (error) {
                            console.error('Error in main file attachment process:', error);
                        }
                    })();
                    true;
                `;

                // Inject the JavaScript code
                webViewRef.current?.injectJavaScript(jsCode);

                if (Platform.OS === 'android') {
                    ToastAndroid.show('Files attached successfully!', ToastAndroid.LONG);
                }

                pickerLock.release();
                return true;
            }
            pickerLock.release();
            return false;
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
        // Better debounce function
        function debounce(func, wait) {
            let timeout;
            let isCalled = false;
            
            return function executedFunction(...args) {
                if (isCalled) return;
                
                isCalled = true;
                const later = () => {
                    timeout = null;
                    isCalled = false;
                    func(...args);
                };
                
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        // Handle input click
        const handleFileInputClick = debounce(function(event) {
            if (event.target.tagName === 'INPUT' && event.target.type === 'file') {
                // Prevent default file dialog
                event.preventDefault();
                
                console.log('File input clicked:', event.target);
                
                // Get file input properties
                const requestData = {
                    type: event.target.accept || '*/*',
                    accept: event.target.accept,
                    multiple: event.target.multiple,
                    id: event.target.id
                };
                
                // Send message to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'fileInputClick',
                    data: requestData
                }));
            }
        }, 300);
        
        // Listen for clicks with capture to get them early
        document.addEventListener('click', handleFileInputClick, true);
        
        // Observe DOM for dynamically added file inputs
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                            const fileInputs = node.querySelectorAll && node.querySelectorAll('input[type="file"]');
                            if (fileInputs && fileInputs.length > 0) {
                                console.log('New file input elements detected');
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing the document
        observer.observe(document.body, { 
            childList: true, 
            subtree: true 
        });
        
        console.log('File input observer initialized');
    })();
    true;
    `;

    const handleMessage = (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);

            if (message.type === 'fileInputClick') {
                handleFileInputRequest(JSON.stringify(message.data));
            }
        } catch (error) {
            console.error('Error parsing WebView message:', error);
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
                onLoadEnd={() => setIsLoading(false)}
                injectedJavaScript={observeDomForFileInputs}
                onMessage={handleMessage}
                allowsFullscreenVideo={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                cacheEnabled={true}
                pullToRefreshEnabled={true}
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