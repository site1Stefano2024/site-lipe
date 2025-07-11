// WhatsApp Integration
const WHATSAPP_NUMBER = '551151924444';

function openWhatsApp(message) {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    window.open(url, '_blank');
}

// Hero Banner Carousel
class HeroBanner {
    constructor() {
        this.slides = [
            {
                title: 'Cuide bem de quem cuida do seu corpo:',
                subtitle: 'sua mente.',
                description: 'Programas de bem-estar e saúde mental para toda a família',
                message: 'Gostaria de conhecer os programas de bem-estar'
            },
            {
                title: 'Mais de 25 anos',
                subtitle: 'cuidando da sua saúde',
                description: 'Uma rede completa de hospitais, clínicas e laboratórios próximos de você',
                message: 'Quero conhecer a rede de atendimento'
            },
            {
                title: 'Telemedicina',
                subtitle: '24 horas por dia',
                description: 'Consultas médicas online com especialistas qualificados',
                message: 'Preciso de atendimento por telemedicina'
            }
        ];
        
        this.currentSlide = 0;
        this.autoSlideInterval = null;
        
        this.init();
    }
    
    init() {
        this.createSlides();
        this.bindEvents();
        this.startAutoSlide();
    }
    
    createSlides() {
        const heroSection = document.querySelector('.hero-banner');
        if (!heroSection) return;
        
        // Clear existing slides
        heroSection.innerHTML = '';
        
        // Create slides
        this.slides.forEach((slide, index) => {
            const slideElement = document.createElement('div');
            slideElement.className = `hero-slide ${index === 0 ? 'active' : ''}`;
            slideElement.innerHTML = `
                <div class="hero-background"></div>
                <div class="container">
                    <div class="hero-content">
                        <h1 class="hero-title">
                            ${slide.title}
                            <span class="accent">${slide.subtitle}</span>
                        </h1>
                        <p class="hero-description">${slide.description}</p>
                        <button class="btn-hero" onclick="openWhatsApp('${slide.message}')">
                            Falar no WhatsApp
                        </button>
                    </div>
                </div>
            `;
            heroSection.appendChild(slideElement);
        });
        
        // Create controls
        const controls = document.createElement('div');
        controls.className = 'hero-controls';
        controls.innerHTML = `
            <button class="hero-nav prev"><i class="fas fa-chevron-left"></i></button>
            <button class="hero-nav next"><i class="fas fa-chevron-right"></i></button>
            <div class="hero-indicators">
                ${this.slides.map((_, index) => 
                    `<span class="indicator ${index === 0 ? 'active' : ''}" data-slide="${index}"></span>`
                ).join('')}
            </div>
        `;
        heroSection.appendChild(controls);
    }
    
    bindEvents() {
        // Navigation buttons
        document.querySelector('.hero-nav.prev')?.addEventListener('click', () => {
            this.prevSlide();
        });
        
        document.querySelector('.hero-nav.next')?.addEventListener('click', () => {
            this.nextSlide();
        });
        
        // Indicators
        document.querySelectorAll('.indicator').forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                this.goToSlide(index);
            });
        });
        
        // Pause auto-slide on hover
        const heroSection = document.querySelector('.hero-banner');
        if (heroSection) {
            heroSection.addEventListener('mouseenter', () => {
                this.stopAutoSlide();
            });
            
            heroSection.addEventListener('mouseleave', () => {
                this.startAutoSlide();
            });
        }
    }
    
    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;
        this.updateSlide();
    }
    
    prevSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.updateSlide();
    }
    
    goToSlide(index) {
        this.currentSlide = index;
        this.updateSlide();
    }
    
    updateSlide() {
        // Update slide visibility
        document.querySelectorAll('.hero-slide').forEach((slide, index) => {
            slide.classList.toggle('active', index === this.currentSlide);
        });
        
        // Update indicators
        document.querySelectorAll('.indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentSlide);
        });
    }
    
    startAutoSlide() {
        this.stopAutoSlide();
        this.autoSlideInterval = setInterval(() => {
            this.nextSlide();
        }, 5000);
    }
    
    stopAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    }
}

// Mobile Menu
class MobileMenu {
    constructor() {
        this.isOpen = false;
        this.init();
    }
    
    init() {
        this.createMobileMenu();
        this.bindEvents();
    }
    
    createMobileMenu() {
        const header = document.querySelector('.main-header .container');
        if (!header) return;
        
        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        mobileMenu.innerHTML = `
            <div class="mobile-menu-content">
                <div class="mobile-menu-section">
                    <h4>Institucional</h4>
                    <ul>
                        <li><a href="#" onclick="openWhatsApp('Gostaria de conhecer a empresa')">Quem Somos</a></li>
                        <li><a href="#" onclick="openWhatsApp('Quero saber sobre a história')">Nossa História</a></li>
                        <li><a href="#" onclick="openWhatsApp('Interessado em missão e valores')">Missão e Valores</a></li>
                    </ul>
                </div>
                <div class="mobile-menu-section">
                    <h4>Para Você</h4>
                    <ul>
                        <li><a href="#" onclick="openWhatsApp('Quero planos individuais')">Planos Individuais</a></li>
                        <li><a href="#" onclick="openWhatsApp('Interessado em planos familiares')">Planos Familiares</a></li>
                        <li><a href="#" onclick="openWhatsApp('Quero saber sobre benefícios')">Benefícios</a></li>
                    </ul>
                </div>
                <div class="mobile-menu-section">
                    <h4>Para Empresas</h4>
                    <ul>
                        <li><a href="#" onclick="openWhatsApp('Planos corporativos')">Planos Corporativos</a></li>
                        <li><a href="#" onclick="openWhatsApp('Gestão de saúde')">Gestão de Saúde</a></li>
                        <li><a href="#" onclick="openWhatsApp('Medicina do trabalho')">Medicina do Trabalho</a></li>
                    </ul>
                </div>
                <div class="mobile-menu-actions">
                    <button class="btn-primary mobile-btn" onclick="openWhatsApp('Quero fazer orçamento')">
                        Falar no WhatsApp
                    </button>
                    <button class="btn-outline mobile-btn" onclick="openWhatsApp('Sou cliente')">
                        Atendimento Cliente
                    </button>
                </div>
            </div>
        `;
        
        header.appendChild(mobileMenu);
        
        // Add mobile menu styles
        const style = document.createElement('style');
        style.textContent = `
            .mobile-menu {
                display: none;
                background: white;
                border-top: 1px solid var(--border);
                padding: 20px 0;
                margin-top: 20px;
            }
            
            .mobile-menu.active {
                display: block;
            }
            
            .mobile-menu-section {
                margin-bottom: 25px;
            }
            
            .mobile-menu-section h4 {
                color: var(--primary);
                margin-bottom: 15px;
                font-size: 1.1rem;
            }
            
            .mobile-menu-section ul {
                list-style: none;
                padding-left: 15px;
            }
            
            .mobile-menu-section li {
                margin-bottom: 10px;
            }
            
            .mobile-menu-section a {
                color: var(--muted);
                text-decoration: none;
                font-size: 0.9rem;
                transition: color 0.3s ease;
            }
            
            .mobile-menu-section a:hover {
                color: var(--primary);
            }
            
            .mobile-menu-actions {
                padding-top: 20px;
                border-top: 1px solid var(--border);
            }
            
            .mobile-btn {
                width: 100%;
                margin-bottom: 10px;
            }
            
            @media (min-width: 769px) {
                .mobile-menu {
                    display: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    bindEvents() {
        const toggleButton = document.querySelector('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (toggleButton && mobileMenu) {
            toggleButton.addEventListener('click', () => {
                this.toggle();
            });
        }
    }
    
    toggle() {
        const mobileMenu = document.querySelector('.mobile-menu');
        const toggleButton = document.querySelector('.mobile-menu-toggle');
        
        if (mobileMenu && toggleButton) {
            this.isOpen = !this.isOpen;
            mobileMenu.classList.toggle('active', this.isOpen);
            
            // Update toggle icon
            const icon = toggleButton.querySelector('i');
            if (icon) {
                icon.className = this.isOpen ? 'fas fa-times' : 'fas fa-bars';
            }
        }
    }
}

// Scroll animations
class ScrollAnimations {
    constructor() {
        this.init();
    }
    
    init() {
        this.observeElements();
    }
    
    observeElements() {
        const elements = document.querySelectorAll(`
            .feature-card,
            .service-card,
            .benefit-card,
            .testimonial-card,
            .contact-method,
            .info-card
        `);
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        elements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(element);
        });
    }
}

// Smooth scrolling for anchor links
function smoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Floating WhatsApp button animations
function initWhatsAppFloat() {
    const floatButton = document.querySelector('.whatsapp-float');
    if (!floatButton) return;
    
    // Add entrance animation
    setTimeout(() => {
        floatButton.style.transform = 'scale(1)';
        floatButton.style.opacity = '1';
    }, 2000);
    
    // Initial state
    floatButton.style.transform = 'scale(0)';
    floatButton.style.opacity = '0';
    floatButton.style.transition = 'all 0.3s ease';
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    new HeroBanner();
    new MobileMenu();
    new ScrollAnimations();
    
    // Initialize other features
    smoothScroll();
    initWhatsAppFloat();
    
    // Add some interactive effects
    addHoverEffects();
});

// Add hover effects to cards and buttons
function addHoverEffects() {
    // Card hover effects
    document.querySelectorAll('.feature-card, .service-card, .benefit-card, .testimonial-card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Button hover effects
    document.querySelectorAll('.btn-primary, .btn-outline, .btn-whatsapp').forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Handle WhatsApp button clicks with analytics (optional)
function trackWhatsAppClick(message) {
    // You can add analytics tracking here
    console.log('WhatsApp click:', message);
    
    // Open WhatsApp
    openWhatsApp(message);
}

// Add loading animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// Add scroll-to-top functionality (optional)
function addScrollToTop() {
    const scrollButton = document.createElement('button');
    scrollButton.className = 'scroll-to-top';
    scrollButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollButton.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 30px;
        width: 50px;
        height: 50px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
        z-index: 999;
    `;
    
    document.body.appendChild(scrollButton);
    
    scrollButton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollButton.style.opacity = '1';
            scrollButton.style.visibility = 'visible';
        } else {
            scrollButton.style.opacity = '0';
            scrollButton.style.visibility = 'hidden';
        }
    });
}

// Initialize scroll to top after DOM is loaded
document.addEventListener('DOMContentLoaded', addScrollToTop);