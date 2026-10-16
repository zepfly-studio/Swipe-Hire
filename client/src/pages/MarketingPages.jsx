// The public website's inner pages. Each is one section of the old single landing page,
// with its own address so it can be shared and found by search engines.
import { FinalCta, Faq, ForCandidates, ForCompanies, HowItWorks, Pricing, PublicLayout } from '../components/marketing';

const Page = ({ children }) => (
  <PublicLayout>
    <div className="pt-6 sm:pt-10">{children}</div>
    <FinalCta />
  </PublicLayout>
);

export const HowItWorksPage = () => (
  <Page>
    <HowItWorks heading="h1" />
  </Page>
);

export const ForCompaniesPage = () => (
  <Page>
    <ForCompanies heading="h1" />
    <HowItWorks />
  </Page>
);

export const ForJobSeekersPage = () => (
  <Page>
    <ForCandidates heading="h1" />
    <HowItWorks />
  </Page>
);

export const PricingPage = () => (
  <Page>
    <Pricing heading="h1" />
  </Page>
);

export const FaqPage = () => (
  <Page>
    <Faq heading="h1" />
  </Page>
);
