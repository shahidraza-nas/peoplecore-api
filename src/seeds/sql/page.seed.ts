import { Seed } from '@core/sql/seeder/seeder.dto';
import { Page } from '../../modules/sql/page/entities/page.entity';

const seed: Seed<Page> = {
  model: 'Page',
  action: 'always',
  alwaysRule: 'update',
  alwaysWhere: (item) => ({ name: item.name }),
  data: [
    {
      name: 'about_us',
      title: 'About Us',
      content: 'Sample about us',
      allow_html: false,
    },
    {
      name: 'privacy',
      title: 'Privacy Policy',
      content: 'Sample privacy policy',
      allow_html: true,
    },
    {
      name: 'terms',
      title: 'Terms and Conditions',
      content: 'Sample terms and conditions',
      allow_html: true,
    },
  ],
};

export default seed;
