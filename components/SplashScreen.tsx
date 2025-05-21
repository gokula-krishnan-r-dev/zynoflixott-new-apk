import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View } from 'react-native';
import { ThemedText } from './ThemedText';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
    onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
    // Animation values
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.3)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        // Sequence of animations
        Animated.sequence([
            // First fade in and scale up the logo
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.spring(logoScale, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true,
                }),
            ]),

            // Then fade in the text
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(textTranslateY, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ]),

            // Wait for a moment
            Animated.delay(500),
        ]).start(() => {
            // Callback when animation sequence is complete
            setTimeout(onFinish, 300);
        });
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
                <Image source={require('../assets/images/appstore.png')} style={styles.logo} />
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
                <ThemedText style={styles.title}>ZynoflixOTT</ThemedText>
                <ThemedText style={styles.subtitle}>Your Ultimate Entertainment Hub</ThemedText>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: width * 0.4,
        height: width * 0.4,
        resizeMode: 'contain',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 10,
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 16,
        color: '#CCCCCC',
    },
});

export default SplashScreen; 