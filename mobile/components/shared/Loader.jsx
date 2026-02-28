import { View, Text, ActivityIndicator } from 'react-native'
import React from 'react'

export default function Loader({size="large"}) {
  return (
    <View
        style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#e8f5e9",
        }}
    >
        <ActivityIndicator size={size} color={"#4CAF50"} />
    </View>
  )
}