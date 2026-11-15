import { StyleSheet, View } from "react-native";
import { Kids4SafeBrand } from "../brand/Kids4SafeBrand";
export function HomeTopBar() { return <View style={styles.bar}><Kids4SafeBrand size={31} /></View>; }
const styles = StyleSheet.create({
  bar: { alignItems: "center", backgroundColor: "transparent", height: 84, justifyContent: "center", paddingHorizontal: 24 }
});
