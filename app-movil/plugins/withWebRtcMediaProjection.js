const { withMainApplication } = require("@expo/config-plugins");

const IMPORT_LINE = "import com.oney.WebRTCModule.WebRTCModuleOptions";
const ENABLE_LINE = "    WebRTCModuleOptions.getInstance().enableMediaProjectionService = true";

module.exports = function withWebRtcMediaProjection(config) {
  return withMainApplication(config, (configWithMainApplication) => {
    const mainApplication = configWithMainApplication.modResults;
    if (mainApplication.language !== "kt") {
      throw new Error("withWebRtcMediaProjection requiere MainApplication.kt");
    }

    if (!mainApplication.contents.includes(IMPORT_LINE)) {
      mainApplication.contents = mainApplication.contents.replace(
        "import android.content.res.Configuration",
        `import android.content.res.Configuration\n\n${IMPORT_LINE}`
      );
    }

    if (!mainApplication.contents.includes(ENABLE_LINE.trim())) {
      mainApplication.contents = mainApplication.contents.replace(
        "    super.onCreate()",
        `    super.onCreate()\n${ENABLE_LINE}`
      );
    }

    return configWithMainApplication;
  });
};
