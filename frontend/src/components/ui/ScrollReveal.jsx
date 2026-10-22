import { useEffect, useRef, useState } from 'react';

export default function ScrollReveal({
  children,
  className = '',
  as: Component = 'div',
  delay = 0,
  threshold = 0.1,
  rootMargin = '0px 0px -40px 0px',
  ...restProps
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Accessibility: reduced motion activates visibility immediately
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, []);

  return (
    <Component
      ref={ref}
      {...restProps}
      style={{
        transitionDelay: delay ? `${delay}ms` : undefined,
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        ...restProps.style,
      }}
      className={`transform transition-[transform,opacity] duration-[600ms] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}
    >
      {children}
    </Component>
  );
}
