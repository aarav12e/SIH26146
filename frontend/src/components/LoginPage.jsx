import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Key, 
  Eye, 
  EyeOff, 
  ArrowRight,
  ShieldAlert,
  Fingerprint,
  CheckCircle2,
  Building2,
  Shield
} from 'lucide-react';

export default function LoginPage({ onLogin, onCancel }) {
  const [badgeId, setBadgeId] = useState('NTRO-CR-8492');
  const [passcode, setPasscode] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('lead_investigator');
  const [authStep, setAuthStep] = useState(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const canvasRef = useRef(null);

  // Preset demo investigator profiles for 1-click evaluation
  const demoProfiles = [
    {
      id: 'NTRO-CR-8492',
      name: 'Dr. Rajesh Varma',
      title: 'Lead Cyber Forensics Officer',
      role: 'lead_investigator',
      badge: 'Directorate Lead'
    },
    {
      id: 'FIU-CYBER-3104',
      name: 'Capt. Ananya Sen',
      title: 'Cryptocurrency AML Analyst',
      role: 'analyst',
      badge: 'AML Specialist'
    },
    {
      id: 'AUDIT-OFFICER-09',
      name: 'Vikramaditya Rao',
      title: 'System Audit & Compliance',
      role: 'auditor',
      badge: 'Air-Gap Auditor'
    }
  ];

  // Dynamic Light-Theme Canvas (Pristine White/Pearl with subtle interactive cyan/blue nodes)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const nodeCount = 48;
    const nodes = [];
    const colors = ['#2563eb', '#0284c7', '#0d9488', '#4f46e5'];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2.2 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2
      });
    }

    const render = () => {
      // Light pearl background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Subtle light grid pattern
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      const gridSize = 64;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update and draw node connections
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        n1.x += n1.vx;
        n1.y += n1.vy;
        n1.pulse += 0.025;

        if (n1.x < 0 || n1.x > width) n1.vx *= -1;
        if (n1.y < 0 || n1.y > height) n1.vy *= -1;

        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.28;
            ctx.strokeStyle = `rgba(37, 99, 235, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const currentRadius = n.radius + Math.sin(n.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSelectProfile = (profile) => {
    setBadgeId(profile.id);
    setRole(profile.role);
    setPasscode('••••••••••••');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthStep('Connecting to MongoDB & verifying cryptographic credentials...');

    try {
      const res = await apiClient.login(badgeId, passcode, role);
      setAuthStep(`Clearance verified via ${res.db_mode || 'MongoDB'}. Initializing workspace...`);

      setTimeout(() => {
        const activeProfile = {
          id: res.officer?.badge_id || badgeId,
          name: res.officer?.name || (badgeId.startsWith('NTRO') ? 'Dr. Rajesh Varma' : 'Capt. Ananya Sen'),
          title: res.officer?.title || 'Cyber Forensics Specialist',
          role: res.officer?.role || role,
          badge: res.officer?.badge || 'Verified Officer',
          token: res.token
        };

        if (rememberMe) {
          localStorage.setItem('ntro_auth_user', JSON.stringify(activeProfile));
        }

        setLoading(false);
        onLogin(activeProfile);
      }, 500);
    } catch (err) {
      setLoading(false);
      setAuthStep(null);
    }
  };

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f8fafc'
    }}>
      
      {/* 1. Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="login-bg-video"
      >
        <source src="/background.mp4" type="video/mp4" />
        <source src="/AI_isolates_tainted_Bitcoin_tran%E2%80%A6_20260927124242.mp4" type="video/mp4" />
      </video>

      {/* 2. Semi-transparent dark veil over video so text and inputs pop */}
      <div className="video-overlay-veil" />

      {/* 3. Subtle Interactive Network Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1,
          pointerEvents: 'none',
          opacity: 0.3
        }}
      />

      {/* 4. Glassmorphic Login Card */}
      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: '470px',
          margin: '24px',
          padding: '36px 32px',
          color: '#0f172a'
        }}
      >
        
        {/* Top Header Badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              width: '8px', height: '8px', 
              borderRadius: '50%', 
              background: '#10b981', 
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
              display: 'inline-block' 
            }} />
            <span style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em' }}>
              OFFLINE SECURE ENCLAVE
            </span>
          </div>

          <span style={{ 
            fontSize: '0.62rem', 
            background: '#eff6ff', 
            border: '1px solid #bfdbfe', 
            color: '#1d4ed8', 
            padding: '3px 8px', 
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontWeight: 700
          }}>
            NTRO FORENSICS
          </span>
        </div>

        {/* Agency Insignia & Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px', height: '52px',
            margin: '0 auto 12px auto',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(37, 99, 235, 0.25)',
            border: '1px solid rgba(255, 255, 255, 0.4)'
          }}>
            <Shield size={26} color="#fff" />
          </div>

          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 800, 
            letterSpacing: '-0.02em', 
            color: '#0f172a',
            marginBottom: '4px' 
          }}>
            NTRO Bitcoin Forensics
          </h1>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
            National Technical Research Organisation · Autonomous Link Analysis
          </p>
        </div>

        {/* Quick 1-Click Role Switcher */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            fontSize: '0.7rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em', 
            color: '#64748b', 
            marginBottom: '8px',
            fontWeight: 700
          }}>
            Select Investigator Profile (1-Click)
          </label>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {demoProfiles.map((p) => {
              const active = badgeId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProfile(p)}
                  style={{
                    padding: '9px 8px',
                    borderRadius: '8px',
                    border: `1.5px solid ${active ? '#2563eb' : '#e2e8f0'}`,
                    background: active ? '#eff6ff' : '#ffffff',
                    color: active ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: active ? '0 2px 8px rgba(37, 99, 235, 0.15)' : 'none'
                  }}
                >
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    display: 'block', 
                    color: active ? '#1e40af' : '#0f172a', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}>
                    {p.name.split(' ')[1] || p.name}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: active ? '#3b82f6' : '#64748b', display: 'block', marginTop: '2px' }}>
                    {p.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Badge ID Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: '#334155', marginBottom: '6px', fontWeight: 600 }}>
              Officer Badge ID / Credentials
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <User size={15} />
              </div>
              <input
                type="text"
                required
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="e.g. NTRO-CR-8492"
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Security Passcode Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.74rem', color: '#334155', fontWeight: 600 }}>
                Security Token / Master Key
              </label>
              <span style={{ fontSize: '0.65rem', color: '#2563eb', fontWeight: 600 }}>
                Offline Cryptographic Enclave
              </span>
            </div>
            
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                <Key size={15} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter security token"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 38px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember Session Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#475569' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#2563eb', borderRadius: '4px' }}
              />
              <span>Remember local session</span>
            </label>
            <span style={{ color: '#059669', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              <ShieldCheck size={12} />
              <span>Air-Gapped TLS</span>
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.28)',
              transition: 'all 0.15s ease'
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin" style={{ display: 'inline-block' }}>◒</span>
                <span>Authenticating Enclave...</span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>Authorize & Access Intelligence Platform</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                marginTop: '10px',
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>← Return to Forensic Dashboard</span>
            </button>
          )}

        </form>

        {/* Status verification ticker */}
        {authStep && (
          <div style={{
            marginTop: '14px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            fontSize: '0.72rem',
            color: '#166534',
            fontFamily: 'monospace',
            textAlign: 'center',
            fontWeight: 600
          }}>
            {authStep}
          </div>
        )}

        {/* Footer Audit Notice */}
        <div style={{ 
          marginTop: '22px', 
          paddingTop: '16px', 
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '0.68rem',
          color: '#64748b'
        }}>
          Government of India · National Technical Research Organisation
          <div style={{ marginTop: '2px', color: '#94a3b8' }}>
            Authorized Personnel Only · All forensic queries are hashed & logged locally
          </div>
        </div>

      </div>

    </div>
  );
}
