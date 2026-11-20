import UIKit
import Capacitor

class AppViewController: CAPBridgeViewController {
    // Same colours as --color-bg in src/styles.css (light #f8f1e8, dark #1a1511). Update both together.
    // Without this the web view paints plain white (light) or black (dark) until the page's first frame.
    private static let pageBackground = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0x1a / 255.0, green: 0x15 / 255.0, blue: 0x11 / 255.0, alpha: 1)
            : UIColor(red: 0xf8 / 255.0, green: 0xf1 / 255.0, blue: 0xe8 / 255.0, alpha: 1)
    }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(BakeTimerPlugin())

        view.backgroundColor = Self.pageBackground
        webView?.backgroundColor = Self.pageBackground
        webView?.scrollView.backgroundColor = Self.pageBackground
    }
}
