import iconSvg from '../../resources/icon.svg';
import useAppVersion from '../hooks/useAppVersion';

const GITHUB_REPO_URL = 'https://github.com/im-red/memo_pads';

interface AboutPageProps {
    onBack: () => void;
}

function AboutPage({ onBack }: AboutPageProps) {
    const { fullString: versionString } = useAppVersion();

    const handleViewWebsite = () => {
        window.open(GITHUB_REPO_URL, '_blank');
    };

    return (
        <div className="settings-container about-container">
            <header className="app-header">
                <button className="back-btn" onClick={onBack}>←</button>
                <div className="header-title">
                    <h1>About</h1>
                </div>
            </header>

            <div className="settings-content">
                <div className="about-app-info">
                    <img className="about-app-icon" src={iconSvg} alt="Memo Pads" />

                    <div className="about-app-name">Memo Pads</div>
                    <div className="about-app-version">{versionString}</div>
                </div>

                <div className="settings-section">
                    <div className="settings-section-title">Information</div>
                    <button className="settings-item settings-item--clickable" onClick={handleViewWebsite}>
                        <div className="settings-item-icon">🌐</div>
                        <div className="settings-item-content">
                            <div className="settings-item-label">View Website</div>
                            <div className="settings-item-hint">GitHub Repository</div>
                        </div>
                        <div className="settings-item-arrow">›</div>
                    </button>
                    <div className="settings-item">
                        <div className="settings-item-icon">📄</div>
                        <div className="settings-item-content">
                            <div className="settings-item-label">License</div>
                            <div className="settings-item-value">MIT License</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AboutPage;
