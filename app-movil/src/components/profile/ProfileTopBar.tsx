import { Kids4SafeBrand } from "../brand/Kids4SafeBrand";
import { StyleSheet, View } from "react-native";

export function ProfileTopBar() {
  return (
    <View style={styles.bar}>
      <Kids4SafeBrand size={31} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: "transparent",
    height: 84,
    justifyContent: "center",
    paddingHorizontal: 24
  }
});
