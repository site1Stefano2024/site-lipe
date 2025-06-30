
// JavaScript for FinanceiroPro Static Website

// WhatsApp Configuration
const phoneNumber = '551151924444';
const defaultMessage = 'Olá, desejo um atendimento!';

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            easing: 'ease-in-out',
            once: true,
            offset: 100
        });
    }

    // Initialize Swiper for partners carousel
    initializeSwiper();

    // Handle navbar scroll effect
    handleNavbarScroll();

    // Handle smooth scrolling for anchor links
    handleSmoothScrolling();

    // Handle accordion functionality
    handleAccordions();
});

// WhatsApp Functions
function openWhatsApp() {
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(defaultMessage)}`;
    window.open(whatsappUrl, '_blank');
}

function openWhatsAppService(serviceName) {
    const customMessage = `Olá, desejo um atendimento sobre ${serviceName}!`;
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(customMessage)}`;
    window.open(whatsappUrl, '_blank');
}

// Initialize Swiper Carousel
function initializeSwiper() {
    if (typeof Swiper !== 'undefined') {
        new Swiper('.partners-swiper', {
            slidesPerView: 2,
            spaceBetween: 30,
            loop: true,
            autoplay: {
                delay: 3000,
                disableOnInteraction: false,
            },
            breakpoints: {
                640: {
                    slidesPerView: 3,
                },
                768: {
                    slidesPerView: 4,
                },
                1024: {
                    slidesPerView: 5,
                },
            },
        });
    }
}

// Handle Navbar Scroll Effect
function handleNavbarScroll() {
    const navbar = document.getElementById('navbar');
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}

// Handle Smooth Scrolling
function handleSmoothScrolling() {
    // Get all anchor links that start with #
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            
            // Skip if it's just # or empty
            if (targetId === '#' || targetId === '') {
                return;
            }
            
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                e.preventDefault();
                
                // Calculate offset for fixed navbar
                const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                const targetPosition = targetElement.offsetTop - navbarHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                const navbarCollapse = document.querySelector('.navbar-collapse');
                if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                    const bsCollapse = new bootstrap.Collapse(navbarCollapse);
                    bsCollapse.hide();
                }
            }
        });
    });
}

// Handle Custom Accordion Functionality
function handleAccordions() {
    const accordionButtons = document.querySelectorAll('.accordion-button');
    
    accordionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-bs-target');
            const targetCollapse = document.querySelector(targetId);
            
            if (targetCollapse) {
                const isExpanded = !targetCollapse.classList.contains('show');
                
                // Close all other accordions in the same group
                const parentAccordion = this.closest('.accordion');
                if (parentAccordion) {
                    const allCollapses = parentAccordion.querySelectorAll('.accordion-collapse');
                    const allButtons = parentAccordion.querySelectorAll('.accordion-button');
                    
                    allCollapses.forEach(collapse => {
                        if (collapse !== targetCollapse && collapse.classList.contains('show')) {
                            collapse.classList.remove('show');
                        }
                    });
                    
                    allButtons.forEach(btn => {
                        if (btn !== this) {
                            btn.classList.add('collapsed');
                        }
                    });
                }
                
                // Toggle current accordion
                if (isExpanded) {
                    targetCollapse.classList.add('show');
                    this.classList.remove('collapsed');
                } else {
                    targetCollapse.classList.remove('show');
                    this.classList.add('collapsed');
                }
            }
        });
    });
}

// Add loading animation for images
function addImageLoadingEffect() {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '0';
            this.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                this.style.opacity = '1';
            }, 50);
        });
    });
}

// Add intersection observer for animations
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements that should animate on scroll
    const animatedElements = document.querySelectorAll('[data-aos]');
    animatedElements.forEach(el => observer.observe(el));
}

// Handle form submissions
function handleForms() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                const originalText = submitButton.textContent;
                submitButton.textContent = 'Enviando...';
                submitButton.disabled = true;
                
                // Simulate form submission
                setTimeout(() => {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                    
                    // Redirect to WhatsApp instead
                    openWhatsApp();
                }, 1000);
            }
        });
    });
}

// Add click tracking for analytics
function addClickTracking() {
    document.addEventListener('click', function(e) {
        const target = e.target.closest('button, a');
        
        if (target) {
            const action = target.textContent.trim() || target.getAttribute('aria-label') || 'click';
            
            // Log click for analytics (you can replace this with your analytics code)
            console.log('Click tracked:', {
                element: target.tagName.toLowerCase(),
                text: action,
                href: target.href || '',
                timestamp: new Date().toISOString()
            });
        }
    });
}

// Error handling for missing dependencies
function handleMissingDependencies() {
    // Check if required libraries are loaded
    const requiredLibraries = ['bootstrap', 'AOS', 'Swiper'];
    
    requiredLibraries.forEach(lib => {
        if (typeof window[lib] === 'undefined') {
            console.warn(`${lib} library not loaded. Some functionality may not work properly.`);
        }
    });
}

// Initialize additional features
function initializeAdditionalFeatures() {
    addImageLoadingEffect();
    addScrollAnimations();
    handleForms();
    addClickTracking();
    handleMissingDependencies();
}

// Call additional initialization after a short delay
setTimeout(initializeAdditionalFeatures, 100);

// Export functions for global access
window.openWhatsApp = openWhatsApp;
window.openWhatsAppService = openWhatsAppService;

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        // Reinitialize animations when page becomes visible
        if (typeof AOS !== 'undefined') {
            AOS.refresh();
        }
    }
});

// Add resize handler for responsive features
window.addEventListener('resize', function() {
    // Refresh Swiper on resize
    if (typeof Swiper !== 'undefined') {
        const swiperInstance = document.querySelector('.partners-swiper')?.swiper;
        if (swiperInstance) {
            swiperInstance.update();
        }
    }
    
    // Refresh AOS on resize
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
});
