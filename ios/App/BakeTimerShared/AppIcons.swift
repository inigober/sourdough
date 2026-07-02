import SwiftUI

// Stroke icons shared with the web app (`src/components/icons.tsx`, viewBox 0 0 20 20).
enum AppIconKind {
    case pen
    case bin
    case arrowLeft
    case arrowRight
    case check
    case plus
    case minus
    case chevronUp
    case chevronDown
    case close
    case eye
    case eyeOff
    case save
    case home
    case user
    case restart
    case help
    case sparkles
    case info
    case scale
    case wheat
    case water
    case clock
    case loaf
    case camera
    case search
    case filter
}

struct AppIconView: View {
    let kind: AppIconKind
    var lineWidth: CGFloat?

    var body: some View {
        AppIconShape(kind: kind)
            .stroke(
                style: StrokeStyle(
                    lineWidth: resolvedLineWidth,
                    lineCap: .round,
                    lineJoin: .round
                )
            )
            .aspectRatio(1, contentMode: .fit)
    }

    private var resolvedLineWidth: CGFloat {
        if let lineWidth {
            return lineWidth
        }
        switch kind {
        case .pen, .bin, .sparkles:
            return 1.35
        case .check, .plus, .minus, .close, .info, .search, .filter:
            return 1.75
        case .restart:
            return 2
        default:
            return 1.5
        }
    }
}

private struct AppIconShape: Shape {
    let kind: AppIconKind

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let scaleX = rect.width / 20
        let scaleY = rect.height / 20

        func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
            CGPoint(x: x * scaleX, y: y * scaleY)
        }

        func circle(centerX: CGFloat, centerY: CGFloat, radius: CGFloat) {
            path.addEllipse(
                in: CGRect(
                    x: (centerX - radius) * scaleX,
                    y: (centerY - radius) * scaleY,
                    width: radius * 2 * scaleX,
                    height: radius * 2 * scaleY
                )
            )
        }

        switch kind {
        case .pen:
            path.move(to: point(13.25, 4.75))
            path.addLine(to: point(15.25, 6.75))
            path.addLine(to: point(7.25, 14.75))
            path.addLine(to: point(4.75, 15.25))
            path.addLine(to: point(5.25, 12.75))
            path.addLine(to: point(13.25, 4.75))
        case .bin:
            path.move(to: point(6, 6.5))
            path.addLine(to: point(14, 6.5))
            path.move(to: point(8, 6.5))
            path.addLine(to: point(8, 5.75))
            path.addQuadCurve(to: point(9, 4.75), control: point(8, 4.75))
            path.addLine(to: point(11, 4.75))
            path.addQuadCurve(to: point(12, 5.75), control: point(12, 4.75))
            path.addLine(to: point(12, 6.5))
            path.move(to: point(7, 6.5))
            path.addLine(to: point(7, 14.75))
            path.addQuadCurve(to: point(7.75, 15.5), control: point(7, 15.5))
            path.addLine(to: point(12.25, 15.5))
            path.addQuadCurve(to: point(13, 14.75), control: point(13, 15.5))
            path.addLine(to: point(13, 6.5))
            path.move(to: point(9, 9))
            path.addLine(to: point(9, 13))
            path.move(to: point(11, 9))
            path.addLine(to: point(11, 13))
        case .arrowLeft:
            path.move(to: point(12.5, 5))
            path.addLine(to: point(7.5, 10))
            path.addLine(to: point(12.5, 15))
        case .arrowRight:
            path.move(to: point(7.5, 5))
            path.addLine(to: point(12.5, 10))
            path.addLine(to: point(7.5, 15))
        case .check:
            path.move(to: point(5, 10))
            path.addLine(to: point(8, 13))
            path.addLine(to: point(15, 5.5))
        case .plus:
            path.move(to: point(10, 5))
            path.addLine(to: point(10, 15))
            path.move(to: point(5, 10))
            path.addLine(to: point(15, 10))
        case .minus:
            path.move(to: point(5, 10))
            path.addLine(to: point(15, 10))
        case .chevronUp:
            path.move(to: point(5, 12.5))
            path.addLine(to: point(10, 7.5))
            path.addLine(to: point(15, 12.5))
        case .chevronDown:
            path.move(to: point(5, 7.5))
            path.addLine(to: point(10, 12.5))
            path.addLine(to: point(15, 7.5))
        case .close:
            path.move(to: point(6, 6))
            path.addLine(to: point(14, 14))
            path.move(to: point(14, 6))
            path.addLine(to: point(6, 14))
        case .eye:
            path.move(to: point(2.5, 10))
            path.addCurve(to: point(17.5, 10), control1: point(5.5, 4.5), control2: point(14.5, 4.5))
            circle(centerX: 10, centerY: 10, radius: 2)
        case .eyeOff:
            path.move(to: point(3, 3))
            path.addLine(to: point(17, 17))
            path.move(to: point(7.5, 8.5))
            path.addCurve(to: point(10, 13.5), control1: point(8.3, 10.2), control2: point(9.2, 12.2))
            path.move(to: point(4.5, 5.5))
            path.addCurve(to: point(2.2, 8.2), control1: point(3.2, 6.6), control2: point(2.2, 8))
            path.move(to: point(13.5, 11.5))
            path.addCurve(to: point(15.8, 9), control1: point(14.5, 10.5), control2: point(15.8, 9))
        case .save:
            path.move(to: point(4, 3.5))
            path.addLine(to: point(12.5, 3.5))
            path.addLine(to: point(16, 7))
            path.addLine(to: point(16, 16.5))
            path.addQuadCurve(to: point(15.5, 17), control: point(16, 17))
            path.addLine(to: point(4.5, 17))
            path.addQuadCurve(to: point(4, 16.5), control: point(4, 17))
            path.addLine(to: point(4, 4))
            path.addQuadCurve(to: point(4.5, 3.5), control: point(4, 3.5))
            path.move(to: point(6.5, 3.5))
            path.addLine(to: point(6.5, 7))
            path.addLine(to: point(12, 7))
            path.move(to: point(6.5, 13))
            path.addLine(to: point(13.5, 13))
        case .home:
            path.move(to: point(3.5, 8.5))
            path.addLine(to: point(10, 3.5))
            path.addLine(to: point(16.5, 8.5))
            path.addLine(to: point(16.5, 16))
            path.addQuadCurve(to: point(15.5, 17), control: point(16.5, 17))
            path.addLine(to: point(12, 17))
            path.addLine(to: point(12, 12.5))
            path.addLine(to: point(8, 12.5))
            path.addLine(to: point(8, 17))
            path.addLine(to: point(4.5, 17))
            path.addQuadCurve(to: point(3.5, 16), control: point(3.5, 17))
            path.addLine(to: point(3.5, 8.5))
        case .user:
            circle(centerX: 10, centerY: 7, radius: 3)
            path.move(to: point(4.5, 16.5))
            path.addCurve(to: point(15.5, 16.5), control1: point(7, 11.5), control2: point(13, 11.5))
        case .restart:
            path.move(to: point(16.5, 7.25))
            path.addCurve(
                to: point(7.75, 14.75),
                control1: point(16.5, 11.7),
                control2: point(12.5, 14.75)
            )
            path.move(to: point(16.5, 4.25))
            path.addLine(to: point(16.5, 7.75))
            path.addLine(to: point(13, 7.75))
        case .help:
            circle(centerX: 10, centerY: 10, radius: 6.5)
            path.move(to: point(8, 8.2))
            path.addCurve(to: point(10.2, 6.2), control1: point(8.2, 7), control2: point(9.1, 6.2))
            path.addCurve(to: point(12.2, 8.2), control1: point(11.3, 6.2), control2: point(12.2, 7))
            path.addCurve(to: point(10, 11.4), control1: point(12.2, 9.7), control2: point(10, 9.8))
            circle(centerX: 10, centerY: 14.2, radius: 0.75)
        case .sparkles:
            path.move(to: point(10, 5.25))
            path.addLine(to: point(10.6, 7.8))
            path.addLine(to: point(13.15, 8.4))
            path.addLine(to: point(10.6, 9))
            path.addLine(to: point(10, 11.55))
            path.addLine(to: point(9.4, 9))
            path.addLine(to: point(6.85, 8.4))
            path.addLine(to: point(9.4, 7.8))
            path.addLine(to: point(10, 5.25))
            path.move(to: point(14.75, 6.25))
            path.addLine(to: point(15.65, 6.25))
            path.move(to: point(15.2, 5.8))
            path.addLine(to: point(15.2, 6.7))
            path.move(to: point(5.05, 14.1))
            path.addLine(to: point(5.95, 14.1))
            path.move(to: point(5.5, 13.65))
            path.addLine(to: point(5.5, 14.55))
        case .info:
            circle(centerX: 10, centerY: 10, radius: 6.5)
            path.move(to: point(10, 9))
            path.addLine(to: point(10, 14))
            path.move(to: point(10, 6.5))
            path.addLine(to: point(10, 7))
        case .scale:
            path.move(to: point(10, 4))
            path.addLine(to: point(10, 16))
            path.move(to: point(6, 8))
            path.addLine(to: point(14, 8))
            path.move(to: point(7, 8))
            path.addLine(to: point(5, 12))
            path.addLine(to: point(9, 12))
            path.move(to: point(13, 8))
            path.addLine(to: point(11, 12))
            path.addLine(to: point(15, 12))
        case .wheat:
            path.move(to: point(10, 17))
            path.addLine(to: point(10, 7))
            path.move(to: point(10, 7))
            path.addCurve(to: point(5, 5), control1: point(8.5, 5), control2: point(6.5, 4.5))
            path.move(to: point(10, 7))
            path.addCurve(to: point(15, 5), control1: point(11.5, 5), control2: point(13.5, 4.5))
            path.move(to: point(10, 10))
            path.addCurve(to: point(6, 8), control1: point(8.8, 8.5), control2: point(7.2, 8))
            path.move(to: point(10, 10))
            path.addCurve(to: point(14, 8), control1: point(11.2, 8), control2: point(12.8, 8.5))
            path.move(to: point(10, 13))
            path.addCurve(to: point(6.8, 11.4), control1: point(9, 11.8), control2: point(7.8, 11.4))
            path.move(to: point(10, 13))
            path.addCurve(to: point(13.2, 11.4), control1: point(11, 11.8), control2: point(12.2, 11.4))
        case .water:
            path.move(to: point(10, 4.5))
            path.addCurve(to: point(14.5, 12.7), control1: point(12.5, 8), control2: point(14.5, 10.5))
            path.addCurve(to: point(10, 17), control1: point(14.5, 15.2), control2: point(12.5, 17))
            path.addCurve(to: point(5.5, 12.7), control1: point(7.5, 17), control2: point(5.5, 15.2))
            path.addCurve(to: point(10, 4.5), control1: point(5.5, 10.5), control2: point(7.5, 8))
        case .clock:
            circle(centerX: 10, centerY: 10, radius: 6.5)
            path.move(to: point(10, 6.5))
            path.addLine(to: point(10, 10))
            path.addLine(to: point(12.5, 12.5))
        case .loaf:
            path.move(to: point(5.5, 11.5))
            path.addCurve(to: point(10, 6), control1: point(5.5, 8.5), control2: point(7.5, 6))
            path.addCurve(to: point(14.5, 11.5), control1: point(12.5, 6), control2: point(14.5, 8.5))
            path.addLine(to: point(14.5, 14))
            path.addQuadCurve(to: point(13.5, 15), control: point(14.5, 15))
            path.addLine(to: point(6.5, 15))
            path.addQuadCurve(to: point(5.5, 14), control: point(5.5, 15))
            path.addLine(to: point(5.5, 11.5))
            path.move(to: point(7.5, 9.5))
            path.addLine(to: point(7.51, 9.5))
            path.move(to: point(10, 8.8))
            path.addLine(to: point(10.01, 8.8))
            path.move(to: point(12.5, 9.5))
            path.addLine(to: point(12.51, 9.5))
        case .camera:
            path.move(to: point(4.5, 7))
            path.addLine(to: point(6.5, 7))
            path.addLine(to: point(7.5, 5.5))
            path.addLine(to: point(12.5, 5.5))
            path.addLine(to: point(13.5, 7))
            path.addLine(to: point(15.5, 7))
            path.addQuadCurve(to: point(16.5, 8), control: point(16.5, 7))
            path.addLine(to: point(16.5, 15.5))
            path.addQuadCurve(to: point(15.5, 16.5), control: point(16.5, 16.5))
            path.addLine(to: point(4.5, 16.5))
            path.addQuadCurve(to: point(3.5, 15.5), control: point(3.5, 16.5))
            path.addLine(to: point(3.5, 8))
            path.addQuadCurve(to: point(4.5, 7), control: point(3.5, 7))
            circle(centerX: 10, centerY: 11.5, radius: 2.5)
        case .search:
            circle(centerX: 9, centerY: 9, radius: 4.75)
            path.move(to: point(12.75, 12.75))
            path.addLine(to: point(16.25, 16.25))
        case .filter:
            path.move(to: point(4, 5.5))
            path.addLine(to: point(16, 5.5))
            path.move(to: point(6.5, 10))
            path.addLine(to: point(13.5, 10))
            path.move(to: point(9, 14.5))
            path.addLine(to: point(11, 14.5))
        }

        return path
    }
}
