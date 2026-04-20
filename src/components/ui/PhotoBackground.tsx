import { ReactNode } from "react";
import {
    Image,
    ImageSourcePropType,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Preset = "sunsetCity";
type Variant = "hero" | "app";

interface PhotoBackgroundProps {
    children?: ReactNode;
    /** Built-in source presets; falls back to `source` when provided. */
    preset?: Preset;
    source?: ImageSourcePropType;
    /**
     * Overlay tone.
     * - `hero` (default): dramatic dusk wash — for full-bleed auth screens
     *   where the photo should dominate.
     * - `app`: very light blush wash — the photo stays clearly visible; text
     *   contrast is handled by opaque cards on top or text shadows.
     */
    variant?: Variant;
    /**
     * Pixel radius for Image.blurRadius. Kept conservative because high values
     * (> 25) can cause the Image to render fully transparent on Android
     * new-arch with edge-to-edge — the image appears to "vanish".
     */
    blurRadius?: number;
    /** Overrides the variant's default overlay palette. */
    overlayColors?: readonly [string, string, ...string[]];
    style?: ViewStyle;
}

const PRESETS: Record<Preset, ImageSourcePropType> = {
    sunsetCity: require("../../../assets/images/sunset-city.png"),
};

// Overlay tones tuned per variant.
// `app` kept very translucent so the photo is unmistakably visible; darker
// anchor colors at top/bottom keep the navigation chrome readable.
const OVERLAY_PRESETS: Record<Variant, readonly [string, string, string]> = {
    hero: [
        "rgba(45,27,61,0.38)",
        "rgba(168,102,150,0.28)",
        "rgba(242,168,190,0.45)",
    ],
    app: [
        "rgba(255,240,232,0.18)",
        "rgba(255,220,230,0.08)",
        "rgba(255,236,225,0.16)",
    ],
};

export function PhotoBackground({
    children,
    preset = "sunsetCity",
    source,
    variant = "hero",
    blurRadius,
    overlayColors,
    style,
}: PhotoBackgroundProps) {
    const resolvedSource = source ?? PRESETS[preset];
    const resolvedOverlay = overlayColors ?? OVERLAY_PRESETS[variant];
    // Safe blur range on both platforms: Android's RenderScript blur can drop
    // frames above ~20 and visually null the image entirely on some devices.
    const resolvedBlur = blurRadius ?? (variant === "app" ? 10 : 14);

    return (
        <View style={[styles.container, style]}>
            {/* Bare Image beats ImageBackground here — on Android new-arch the
          ImageBackground inner Image sometimes drops blurRadius. Explicit
          width/height defend against flex parents that briefly measure 0. */}
            <Image
                source={resolvedSource}
                blurRadius={resolvedBlur}
                resizeMode="cover"
                style={styles.photo}
            />
            <LinearGradient
                colors={[...resolvedOverlay]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
            />
            <View style={styles.content}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: "hidden",
    },
    photo: {
        ...StyleSheet.absoluteFillObject,
        width: "100%",
        height: "100%",
    },
    content: {
        flex: 1,
    },
});
