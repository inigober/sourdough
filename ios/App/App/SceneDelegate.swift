import UIKit
import Capacitor

// UIKit creates one of these per scene (window). Main.storyboard is attached to the scene via
// UISceneStoryboardFile in Info.plist, so UIKit builds `window` and AppViewController for us.
// Capacitor needs URL and universal-link events forwarded to its proxy; the app delegate no
// longer receives them once the app uses scenes.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        // Timer alerts open bake mode through sourdough://bake.
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
