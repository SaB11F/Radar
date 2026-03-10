import { Tabs } from 'expo-router';
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import COLORS from "../../constants/colors";

export default function TabLayout() {
    const insets = useSafeAreaInsets();

  return (
    <Tabs
        screenOptions = {{
            headerShown: false,
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textMuted,
            headerShadowVisible: false,
            tabBarStyle:{
                backgroundColor: COLORS.cardBackground,
                borderTopWidth: 1,
                borderTopColor: COLORS.border,
                paddingTop: 5,
                paddingBottom: insets.bottom,
                height: 60 + insets.bottom,
            },
            tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: "700",
            },
        }}
    >
        <Tabs.Screen 
            name="map" 
            options={{
                title: "Devices",
                tabBarIcon: ({color,size}) => (<Ionicons 
                    name='radio-outline'
                    size={size}
                    color={color}
                />)
            }}
        />

        <Tabs.Screen 
            name="index"
            options={{
                title: "Dashboard",
                tabBarIcon: ({color,size}) => (<Ionicons 
                    name='home-outline'
                    size={size}
                    color={color}
                />)
            }}
        />

        <Tabs.Screen 
            name="profile" 
            options={{
                title: "Settings",
                tabBarIcon: ({color,size}) => (<Ionicons 
                    name='settings-outline'
                    size={size}
                    color={color}
                />)
            }}
        />
        
    </Tabs>
  )
}
