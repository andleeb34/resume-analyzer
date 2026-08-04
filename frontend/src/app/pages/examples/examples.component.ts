import { Component, signal } from '@angular/core';

interface ExperienceEntry {
  role: string;
  company: string;
  period: string;
  bullets: string[];
}

interface SampleResume {
  id: string;
  name: string;
  title: string;
  location: string;
  email: string;
  summary: string;
  experience: ExperienceEntry[];
  education: string[];
  skills: string[];
}

@Component({
  selector: 'app-examples',
  standalone: true,
  templateUrl: './examples.component.html',
  styleUrl: './examples.component.scss'
})
export class ExamplesComponent {
  resumes: SampleResume[] = [
    {
      id: 'software-engineer',
      name: 'Amina Raza',
      title: 'Software Engineer',
      location: 'Lahore, Pakistan',
      email: 'amina.raza@email.com',
      summary:
        'Backend-focused software engineer with 4 years of experience building and scaling APIs for fintech products. Comfortable owning a service end to end, from design through on-call.',
      experience: [
        {
          role: 'Software Engineer II',
          company: 'Paylink Technologies',
          period: '2023 — Present',
          bullets: [
            'Redesigned the payments settlement service, cutting average reconciliation time from 6 hours to 40 minutes.',
            'Introduced contract tests between 3 internal services, reducing production incidents caused by API drift by 70%.',
            'Mentored 2 junior engineers and ran the team\'s weekly code review sessions.'
          ]
        },
        {
          role: 'Software Engineer',
          company: 'Nimbus Retail',
          period: '2021 — 2023',
          bullets: [
            'Built the inventory sync pipeline connecting 5 warehouse systems to the central catalog.',
            'Migrated a legacy PHP checkout flow to Node.js, improving p95 latency by 35%.'
          ]
        }
      ],
      education: ['BSc Computer Science — FAST-NUCES, Lahore (2021)'],
      skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'System Design']
    },
    {
      id: 'marketing-manager',
      name: 'Bilal Ahmed',
      title: 'Marketing Manager',
      location: 'Karachi, Pakistan',
      email: 'bilal.ahmed@email.com',
      summary:
        'Growth-oriented marketing manager with 6 years leading campaigns across digital and offline channels for consumer brands, with a track record of hitting acquisition targets on flat budgets.',
      experience: [
        {
          role: 'Marketing Manager',
          company: 'Zaiqa Foods',
          period: '2022 — Present',
          bullets: [
            'Led a rebrand across 3 product lines, growing social engagement by 65% in the first two quarters.',
            'Managed a PKR 40M annual marketing budget across digital, TV, and retail activations.',
            'Built an in-house content team, cutting agency spend by 30% without losing output quality.'
          ]
        },
        {
          role: 'Senior Marketing Executive',
          company: 'Bright Beverages',
          period: '2019 — 2022',
          bullets: [
            'Ran performance marketing campaigns that grew e-commerce revenue by 3x over two years.',
            'Launched a loyalty program that reached 50,000 active members within its first year.'
          ]
        }
      ],
      education: ['BBA Marketing — LUMS, Lahore (2019)'],
      skills: ['Brand Strategy', 'Performance Marketing', 'Meta & Google Ads', 'Team Leadership', 'Analytics']
    },
    {
      id: 'fresh-graduate',
      name: 'Hira Sheikh',
      title: 'Business Graduate — Entry Level',
      location: 'Islamabad, Pakistan',
      email: 'hira.sheikh@email.com',
      summary:
        'Recent business graduate with internship experience in operations and a strong academic record. Looking for an entry-level role where I can apply analytical and organizational skills.',
      experience: [
        {
          role: 'Operations Intern',
          company: 'Horizon Logistics',
          period: 'Jun 2025 — Aug 2025',
          bullets: [
            'Assisted in tracking shipment data for 200+ weekly deliveries and flagged delays before they reached customers.',
            'Built a simple spreadsheet dashboard that the team still uses to monitor daily delivery performance.'
          ]
        },
        {
          role: 'Volunteer Coordinator',
          company: 'University Business Society',
          period: '2023 — 2025',
          bullets: [
            'Organized 4 campus events with 100+ attendees each, coordinating logistics and 15 student volunteers.'
          ]
        }
      ],
      education: ['BBA — Bahria University, Islamabad (2025), CGPA 3.7/4.0'],
      skills: ['Excel', 'Data Entry & Reporting', 'Communication', 'Project Coordination', 'Canva']
    }
  ];

  activeId = signal(this.resumes[0].id);

  get active(): SampleResume {
    return this.resumes.find(r => r.id === this.activeId()) ?? this.resumes[0];
  }

  select(id: string): void {
    this.activeId.set(id);
  }
}
