import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Slide {
  icon: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    icon: "🆘",
    title: "Instant Help",
    description: "One tap connects you with nearby mechanics ready to assist within minutes",
  },
  {
    icon: "📍",
    title: "Real-Time Tracking",
    description: "Watch your mechanic arrive with live GPS tracking and accurate ETAs",
  },
  {
    icon: "⭐",
    title: "Trusted Mechanics",
    description: "All mechanics are verified, rated, and reviewed by real customers",
  },
];

const OnboardingSlides = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="w-full max-w-sm">
      {/* Slide content */}
      <div className="relative h-52 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 mb-6 overflow-hidden">
        <div 
          className="flex transition-transform duration-300 ease-in-out h-full"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div 
              key={index} 
              className="min-w-full flex flex-col items-center justify-center text-center px-4"
            >
              <span className="text-5xl mb-4">{slide.icon}</span>
              <h3 className="text-lg font-semibold text-foreground mb-2">{slide.title}</h3>
              <p className="text-sm text-muted-foreground">{slide.description}</p>
            </div>
          ))}
        </div>

        {/* Navigation arrows */}
        <button 
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center shadow-sm hover:bg-background transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center shadow-sm hover:bg-background transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentSlide ? "bg-primary" : "bg-muted-foreground/30"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default OnboardingSlides;
