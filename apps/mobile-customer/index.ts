import { registerRootComponent } from "expo";
import { setupWebShell } from "./src/web/setupWebShell";
import App from "./App";

setupWebShell();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
