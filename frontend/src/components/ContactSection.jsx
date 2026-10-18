import { useState } from 'react';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Please enter your name';
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.message.trim()) newErrors.message = 'Please enter a message';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => setSubmitted(false), 4000);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  return (
    <section id="contact" className="py-20 lg:py-28 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-[#666] mb-4">Contact</p>
            <h2 className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-normal mb-8">
              We're here to help.
            </h2>
            <p className="text-base text-[#555] leading-relaxed mb-12">
              This is a fictional portfolio project. The form is presented as a design demonstration and does not transmit information.
            </p>
            <div className="pt-8 border-t border-[#E8E8E8]">
              <p className="text-xs tracking-[0.2em] uppercase text-[#666] mb-2">General Enquiries</p>
              <p className="text-sm">contact@velor-fashion.dz</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8" noValidate>
            <div>
              <label htmlFor="name" className="block text-sm mb-3">Full name</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                className={`w-full border-b ${errors.name ? 'border-red-500' : 'border-[#E8E8E8]'} py-3 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors bg-transparent`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-2">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm mb-3">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`w-full border-b ${errors.email ? 'border-red-500' : 'border-[#E8E8E8]'} py-3 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors bg-transparent`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-2">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="message" className="block text-sm mb-3">Message</label>
              <textarea
                id="message"
                name="message"
                rows={4}
                value={formData.message}
                onChange={handleChange}
                placeholder="How can we help?"
                className={`w-full border-b ${errors.message ? 'border-red-500' : 'border-[#E8E8E8]'} py-3 text-sm focus:outline-none focus:border-[#0A0A0A] transition-colors bg-transparent resize-y`}
              />
              {errors.message && <p className="text-xs text-red-500 mt-2">{errors.message}</p>}
            </div>

            <button
              type="submit"
              className="bg-[#0A0A0A] text-white px-8 py-4 text-xs tracking-[0.2em] uppercase font-medium hover:bg-[#333333] transition-colors inline-flex items-center gap-3 cursor-pointer"
            >
              Prepare Message
              <span aria-hidden="true">→</span>
            </button>

            {submitted && (
              <p className="text-sm text-green-700">
                Thank you. This is a demonstration — no message was sent.
              </p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
