import {
    JosefinSans_300Light,
    JosefinSans_400Regular,
    JosefinSans_600SemiBold,
    JosefinSans_700Bold,
    useFonts
} from '@expo-google-fonts/josefin-sans';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import { ThemedText } from './ThemedText';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
    // Load fonts
    const [fontsLoaded] = useFonts({
        JosefinSans_400Regular,
        JosefinSans_700Bold,
        JosefinSans_600SemiBold,
        JosefinSans_300Light
    });

    // Animation values
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const logoRotate = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(20)).current;
    const shimmerOpacity = useRef(new Animated.Value(0)).current;
    const shimmerPosition = useRef(new Animated.Value(-width)).current;
    const backgroundOpacity = useRef(new Animated.Value(0)).current;

    // Interpolate rotation value
    const spin = logoRotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    useEffect(() => {
        if (!fontsLoaded) return;

        // Fade in background first
        Animated.timing(backgroundOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();

        // Shimmer animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerOpacity, {
                    toValue: 0.7,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerPosition, {
                    toValue: width,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerOpacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerPosition, {
                    toValue: -width,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Sequence of animations
        Animated.sequence([
            // First rotate and fade in logo
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(logoRotate, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),

            // Then fade in the text with a bounce effect
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(textTranslateY, {
                    toValue: 0,
                    friction: 4,
                    tension: 20,
                    useNativeDriver: true,
                }),
            ]),

            // Wait for a moment
            Animated.delay(800),
        ]).start(() => {
            // Callback when animation sequence is complete
            setTimeout(onFinish, 400);
        });
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar translucent backgroundColor="transparent" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" />

            {/* <Animated.View style={[styles.background, { opacity: backgroundOpacity }]}>
                <LinearGradient
                    colors={['#1a0533', '#2c1157', '#4b1d9e']}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            </Animated.View> */}

            {/* Animated background particles */}
            <View style={styles.particles}>
                {[...Array(12)].map((_, i) => (
                    <View key={i} style={[styles.particle, {
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        width: Math.random() * 6 + 2,
                        height: Math.random() * 6 + 2,
                        opacity: Math.random() * 0.5 + 0.1
                    }]} />
                ))}
            </View>

            <View style={styles.contentContainer}>
                <Animated.View
                    style={[
                        styles.logoContainer,
                        {
                            opacity: logoOpacity,
                            transform: [
                                { scale: logoScale },
                                { rotate: spin }
                            ]
                        }
                    ]}
                >
                    <Image source={require('../assets/images/logo.png')} style={styles.logo} />

                    {/* Shimmer effect */}
                    <Animated.View
                        style={[
                            styles.shimmer,
                            {
                                opacity: shimmerOpacity,
                                transform: [{ translateX: shimmerPosition }]
                            }
                        ]}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.textContainer,
                        {
                            opacity: textOpacity,
                            transform: [{ translateY: textTranslateY }]
                        }
                    ]}
                >
                    <ThemedText style={styles.title}>Zynoflix <Text style={styles.ottText}>OTT</Text></ThemedText>
                    <ThemedText style={styles.subtitle}>Your Ultimate Entertainment Hub</ThemedText>
                </Animated.View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        overflow: 'hidden',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#2c1157',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: width * 0.2,
    },
    logo: {
        width: width * 0.5,
        height: width * 0.5,
        resizeMode: 'contain',
    },
    shimmer: {
        position: 'absolute',
        top: -20,
        left: 0,
        width: 40,
        height: width,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        transform: [{ rotate: '25deg' }],
    },
    textContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 30,
        paddingVertical: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(8px)',
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        fontFamily: 'JosefinSans_700Bold',
        letterSpacing: 1.5,
        marginBottom: 12,
        color: '#FFFFFF',
        textShadowColor: 'rgba(75, 29, 158, 0.8)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 10,
        textTransform: 'uppercase',
    },
    ottText: {
        color: '#9C27B0',
        fontWeight: '900',
        fontFamily: 'JosefinSans_700Bold',
        letterSpacing: 3,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'JosefinSans_400Regular',
        color: '#e0e0e0',
        letterSpacing: 0.5,
        fontWeight: '500',
    },
    particles: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    particle: {
        position: 'absolute',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 50,
    },
});

export default SplashScreen; 