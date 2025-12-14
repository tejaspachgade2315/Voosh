/**
 * News Ingestion Script
 * 
 * This script fetches news articles from various RSS feeds,
 * processes them into chunks, generates embeddings, and stores them
 * in the vector store for RAG retrieval.
 */

require('dotenv').config();
const Parser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const vectorStore = require('../services/vectorStore');
const config = require('../config');

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
  },
});

// RSS Feed sources for news
const NEWS_FEEDS = [
  { name: 'BBC News', url: 'http://feeds.bbci.co.uk/news/rss.xml' },
  { name: 'BBC Technology', url: 'http://feeds.bbci.co.uk/news/technology/rss.xml' },
  { name: 'BBC Business', url: 'http://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'Reuters Top News', url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
];

// Alternative static news data for fallback
const FALLBACK_NEWS = [
  {
    title: "Artificial Intelligence Transforms Healthcare Industry",
    content: "Major hospitals across the country are implementing AI-powered diagnostic tools that can detect diseases earlier than traditional methods. The technology uses machine learning algorithms trained on millions of medical images to identify patterns that human doctors might miss. Early trials show a 30% improvement in early cancer detection rates. Healthcare experts predict this technology will become standard in most hospitals within the next five years.",
    source: "Tech Health Daily",
    date: "2024-12-01"
  },
  {
    title: "Global Climate Summit Reaches Historic Agreement",
    content: "World leaders at the annual climate summit have agreed to ambitious new targets for reducing carbon emissions. The agreement commits participating nations to achieving net-zero emissions by 2050 and provides funding mechanisms for developing countries to transition to renewable energy. Environmental groups have praised the deal while urging faster implementation. Key provisions include phasing out coal power plants and investing in green hydrogen technology.",
    source: "Environmental News Network",
    date: "2024-12-02"
  },
  {
    title: "Tech Giants Report Strong Quarterly Earnings",
    content: "Major technology companies have reported better-than-expected earnings for the third quarter, driven by strong demand for cloud computing services and digital advertising. Revenue growth exceeded analyst expectations by an average of 15%. Companies are investing heavily in artificial intelligence infrastructure, with capital expenditures reaching record levels. The positive results have boosted investor confidence in the technology sector.",
    source: "Financial Times",
    date: "2024-12-03"
  },
  {
    title: "New Space Mission Discovers Water on Mars",
    content: "Scientists have confirmed the discovery of subsurface water ice on Mars, raising hopes for future human colonization. The discovery was made using advanced radar technology aboard the latest Mars orbiter. The water reserves are estimated to be enough to support a permanent human settlement. Space agencies are now accelerating plans for manned missions to the red planet.",
    source: "Space Exploration Weekly",
    date: "2024-12-04"
  },
  {
    title: "Electric Vehicle Sales Surge Worldwide",
    content: "Global electric vehicle sales have reached a new milestone, with EVs now accounting for 20% of all new car sales. Government incentives and improved battery technology have made electric cars more accessible to consumers. Major automakers are expanding their EV lineups and investing in charging infrastructure. Analysts predict EVs will outsell traditional vehicles by 2030.",
    source: "Auto Industry News",
    date: "2024-12-05"
  },
  {
    title: "Breakthrough in Quantum Computing Achieved",
    content: "Researchers have demonstrated a quantum computer that can solve problems beyond the capability of classical supercomputers. The breakthrough represents a significant milestone in quantum computing development. The technology has potential applications in drug discovery, cryptography, and financial modeling. Tech companies are racing to commercialize quantum computing solutions.",
    source: "Science Daily",
    date: "2024-12-06"
  },
  {
    title: "Global Food Prices Rise Amid Supply Chain Challenges",
    content: "Food prices worldwide have increased significantly due to ongoing supply chain disruptions and extreme weather events. The price increases are affecting both developed and developing nations, with the highest impact on staple foods like wheat and rice. Governments are implementing measures to stabilize food supplies and protect vulnerable populations. Agricultural experts are calling for investment in climate-resilient farming practices.",
    source: "World Economic Report",
    date: "2024-12-07"
  },
  {
    title: "Major Cybersecurity Threat Neutralized by International Cooperation",
    content: "Law enforcement agencies from multiple countries have successfully dismantled a major cybercrime network responsible for ransomware attacks. The operation involved coordinated raids across several continents and resulted in numerous arrests. The takedown is expected to significantly reduce ransomware incidents globally. Cybersecurity experts emphasize the importance of continued international cooperation in fighting cybercrime.",
    source: "Cybersecurity Today",
    date: "2024-12-08"
  },
  {
    title: "Renewable Energy Investment Reaches Record Levels",
    content: "Investment in renewable energy projects has surged to unprecedented levels, with solar and wind power leading the growth. Private sector investment has been driven by falling costs and favorable government policies. New solar installations have doubled compared to last year, while offshore wind projects are expanding rapidly. Energy analysts predict renewables will dominate global power generation by 2040.",
    source: "Green Energy Report",
    date: "2024-12-09"
  },
  {
    title: "Advances in Gene Therapy Offer Hope for Rare Diseases",
    content: "New gene therapy treatments have shown remarkable success in treating previously incurable genetic disorders. Clinical trials have demonstrated the ability to correct genetic mutations responsible for rare diseases. Patients who received the therapy have shown significant improvement in symptoms and quality of life. Regulatory agencies are fast-tracking approval processes to make these treatments available sooner.",
    source: "Medical Breakthroughs Journal",
    date: "2024-12-10"
  },
  {
    title: "Smart Cities Initiative Launches in Major Metropolitan Areas",
    content: "Several major cities have launched comprehensive smart city initiatives aimed at improving urban living through technology. The projects include smart traffic management, automated waste collection, and IoT-enabled public services. Early implementations have shown reductions in traffic congestion and energy consumption. City planners expect the technology to transform urban infrastructure over the next decade.",
    source: "Urban Development News",
    date: "2024-12-11"
  },
  {
    title: "International Trade Agreement Opens New Markets",
    content: "A landmark trade agreement between major economies has been finalized, reducing tariffs and opening new markets for businesses. The deal is expected to boost economic growth and create new jobs across participating nations. Key sectors benefiting from the agreement include technology, agriculture, and manufacturing. Trade experts are calling it the most significant agreement in decades.",
    source: "Global Trade Monitor",
    date: "2024-12-12"
  },
  {
    title: "Breakthrough in Battery Technology Promises Longer-Lasting Devices",
    content: "Scientists have developed a new type of battery that can store significantly more energy while being safer and more environmentally friendly. The solid-state battery technology eliminates the fire risk associated with current lithium-ion batteries. Initial applications will include smartphones and laptops, with electric vehicles to follow. The technology is expected to revolutionize portable electronics and transportation.",
    source: "Tech Innovation Weekly",
    date: "2024-12-13"
  },
  {
    title: "Education Systems Embrace AI-Powered Learning Tools",
    content: "Schools and universities worldwide are implementing artificial intelligence tools to personalize education for students. The AI systems can adapt to individual learning styles and provide customized lesson plans. Early results show improved student engagement and academic performance. Educators are optimistic about the technology's potential to address learning gaps and support diverse student needs.",
    source: "Education Technology Review",
    date: "2024-12-14"
  },
  {
    title: "Global Health Initiative Aims to Eradicate Preventable Diseases",
    content: "A new international health initiative has been launched with the goal of eliminating several preventable diseases within a decade. The program focuses on vaccination campaigns, clean water access, and healthcare infrastructure in developing regions. Major funding commitments have been secured from governments and philanthropic organizations. Health experts believe the initiative could save millions of lives.",
    source: "World Health Reporter",
    date: "2024-12-15"
  },
  {
    title: "Autonomous Delivery Services Expand to New Cities",
    content: "Autonomous delivery robots and drones are expanding to dozens of new cities following successful pilot programs. The technology promises faster and more efficient last-mile delivery for packages and food. Safety testing has demonstrated reliability in various weather conditions and traffic scenarios. Logistics companies are investing heavily in autonomous delivery infrastructure.",
    source: "Logistics Innovation News",
    date: "2024-12-16"
  },
  {
    title: "Ocean Cleanup Project Shows Promising Results",
    content: "A major ocean cleanup initiative has removed record amounts of plastic waste from the Pacific Ocean. The project uses innovative collection systems designed to concentrate and extract floating plastic debris. Environmental scientists report significant reduction in microplastic levels in treated areas. The success has inspired similar projects in other ocean regions.",
    source: "Environmental Conservation Today",
    date: "2024-12-17"
  },
  {
    title: "5G Network Expansion Accelerates Globally",
    content: "5G wireless networks are expanding rapidly worldwide, bringing ultra-fast connectivity to billions of users. The technology enables new applications in virtual reality, autonomous vehicles, and industrial automation. Telecom companies are investing billions in infrastructure to ensure comprehensive coverage. Industry analysts expect 5G to become the dominant mobile network standard by 2025.",
    source: "Telecom Industry Report",
    date: "2024-12-18"
  },
  {
    title: "Sustainable Fashion Movement Gains Momentum",
    content: "The fashion industry is undergoing a transformation as consumers demand more sustainable and ethical products. Major brands are committing to using recycled materials and reducing carbon emissions in production. Secondhand and rental clothing services are experiencing rapid growth. Industry experts predict sustainable fashion will become mainstream within five years.",
    source: "Fashion Industry Weekly",
    date: "2024-12-19"
  },
  {
    title: "Mental Health Services See Increased Funding and Access",
    content: "Governments and healthcare providers are expanding mental health services in response to growing demand. New initiatives include increased funding for counseling services and integration of mental health into primary care. Telehealth platforms are making mental health support more accessible, especially in rural areas. Experts welcome the increased attention to mental health as essential for public wellbeing.",
    source: "Healthcare Policy Review",
    date: "2024-12-20"
  },
  {
    title: "Blockchain Technology Transforms Supply Chain Management",
    content: "Companies are increasingly adopting blockchain technology to improve transparency and efficiency in supply chains. The distributed ledger technology enables real-time tracking of products from manufacturer to consumer. Benefits include reduced fraud, faster dispute resolution, and improved quality control. Industry analysts predict widespread blockchain adoption in supply chain management within three years.",
    source: "Supply Chain Technology News",
    date: "2024-12-21"
  },
  {
    title: "Space Tourism Industry Takes Off with Commercial Flights",
    content: "Commercial space tourism has officially launched with the first regular passenger flights to low Earth orbit. Ticket prices have dropped significantly as multiple companies compete in the market. The experience includes views of Earth from space and brief periods of weightlessness. Industry experts predict space tourism will become a mainstream travel option within a decade.",
    source: "Space Industry Report",
    date: "2024-12-22"
  },
  {
    title: "Agricultural Technology Helps Farmers Adapt to Climate Change",
    content: "New agricultural technologies are helping farmers adapt to changing climate conditions and maintain crop yields. Innovations include drought-resistant crop varieties, precision irrigation systems, and AI-powered pest management. The technology is particularly beneficial for smallholder farmers in developing countries. Agricultural experts emphasize the importance of continued investment in climate-smart farming solutions.",
    source: "Agricultural Innovation Review",
    date: "2024-12-23"
  },
  {
    title: "Digital Banking Revolution Reaches Developing Countries",
    content: "Mobile banking services are rapidly expanding in developing countries, providing financial access to previously unbanked populations. The technology enables people to save, borrow, and transfer money using just a smartphone. Financial inclusion initiatives are empowering small businesses and promoting economic development. Experts predict digital banking will reach one billion new users by 2026.",
    source: "Financial Inclusion Report",
    date: "2024-12-24"
  },
  {
    title: "Advances in Robotics Transform Manufacturing Industries",
    content: "Advanced robotics technology is revolutionizing manufacturing with improved precision, speed, and flexibility. Collaborative robots working alongside humans are becoming standard in factories worldwide. The technology is enabling reshoring of manufacturing as labor cost advantages diminish. Industry analysts expect robotics to fundamentally transform production within the next decade.",
    source: "Manufacturing Technology Today",
    date: "2024-12-25"
  },
  {
    title: "Urban Farming Initiatives Address Food Security Concerns",
    content: "Cities worldwide are embracing urban farming to improve local food security and reduce environmental impact. Vertical farms and rooftop gardens are producing fresh vegetables year-round in urban environments. The approach reduces transportation costs and carbon emissions associated with food distribution. Urban planning experts see local food production as essential for sustainable city development.",
    source: "Urban Agriculture News",
    date: "2024-12-26"
  },
  {
    title: "Biometric Security Systems Become Standard in Public Spaces",
    content: "Biometric identification systems are being deployed in airports, stadiums, and other public venues to enhance security. The technology uses facial recognition and other biological markers to identify individuals. Privacy advocates are calling for stronger regulations to protect personal data. Security experts emphasize the need to balance safety benefits with privacy concerns.",
    source: "Security Technology Review",
    date: "2024-12-27"
  },
  {
    title: "Virtual Reality Therapy Shows Promise for Mental Health Treatment",
    content: "Virtual reality is being used as a therapeutic tool for treating anxiety, phobias, and PTSD. The technology allows patients to confront fears in controlled virtual environments. Clinical studies have shown significant improvement in symptoms compared to traditional therapy. Mental health professionals are optimistic about VR's potential to expand access to effective treatment.",
    source: "Mental Health Technology Journal",
    date: "2024-12-28"
  },
  {
    title: "Hydrogen Fuel Technology Advances for Transportation",
    content: "Hydrogen fuel cell technology is making significant progress for use in trucks, trains, and ships. The clean energy source produces only water as a byproduct, offering an alternative to battery electric vehicles. Major investments are being made in hydrogen production and distribution infrastructure. Transportation experts see hydrogen as essential for decarbonizing heavy-duty vehicles.",
    source: "Clean Transportation Report",
    date: "2024-12-29"
  },
  {
    title: "Personalized Medicine Revolution Transforms Patient Care",
    content: "Advances in genomics and data analytics are enabling truly personalized medical treatments tailored to individual patients. Genetic testing helps doctors prescribe the most effective medications with fewer side effects. The approach is particularly impactful in cancer treatment and rare disease management. Healthcare systems are adapting to incorporate personalized medicine into standard care practices.",
    source: "Precision Medicine Today",
    date: "2024-12-30"
  },
  {
    title: "Smart Grid Technology Improves Energy Efficiency",
    content: "Utilities are deploying smart grid technology to optimize electricity distribution and integrate renewable energy sources. The systems use real-time data to balance supply and demand, reducing waste and preventing blackouts. Consumers benefit from lower bills and the ability to sell excess solar energy back to the grid. Energy regulators are encouraging smart grid adoption as essential for energy transition.",
    source: "Energy Grid Innovation",
    date: "2024-12-31"
  },
  {
    title: "E-commerce Growth Reshapes Retail Industry",
    content: "Online shopping continues to grow rapidly, forcing traditional retailers to adapt or face decline. Companies are investing in omnichannel strategies that integrate online and physical store experiences. Warehouse automation and faster delivery options are becoming competitive necessities. Retail analysts predict continued consolidation as the industry adjusts to changing consumer behavior.",
    source: "Retail Industry Analysis",
    date: "2025-01-01"
  },
  {
    title: "Biotechnology Advances Enable Synthetic Food Production",
    content: "Biotechnology companies are developing lab-grown proteins and synthetic food products to address sustainability concerns. Cultivated meat production has scaled significantly, with prices approaching conventional products. The technology offers environmental benefits including reduced land use and greenhouse gas emissions. Food industry experts see synthetic foods as an important part of the future food system.",
    source: "Food Technology Review",
    date: "2025-01-02"
  },
  {
    title: "Augmented Reality Applications Transform Retail Shopping",
    content: "Retailers are implementing augmented reality features that allow customers to visualize products before purchasing. The technology enables virtual try-on for clothing, furniture placement in homes, and interactive product demonstrations. Consumer adoption has increased significantly with improvements in smartphone AR capabilities. Marketing experts see AR as essential for engaging digital-native consumers.",
    source: "Retail Technology News",
    date: "2025-01-03"
  },
  {
    title: "Cloud Computing Continues Rapid Expansion",
    content: "Cloud computing services are experiencing continued growth as businesses accelerate digital transformation efforts. Major providers are expanding data center capacity to meet growing demand. New services focus on artificial intelligence, edge computing, and improved security. Enterprise technology leaders see cloud adoption as essential for business competitiveness.",
    source: "Cloud Computing Weekly",
    date: "2025-01-04"
  },
  {
    title: "Telemedicine Adoption Remains High After Pandemic Surge",
    content: "Virtual healthcare visits have become a permanent fixture of healthcare delivery following pandemic-driven adoption. Patients appreciate the convenience of consulting doctors from home for non-emergency conditions. Healthcare providers are investing in telemedicine infrastructure and training. Regulations have been updated to support continued growth of remote healthcare services.",
    source: "Digital Health Report",
    date: "2025-01-05"
  },
  {
    title: "Carbon Capture Technology Scales Up Industrial Deployment",
    content: "Industrial carbon capture systems are being deployed at scale to reduce emissions from power plants and factories. The technology captures CO2 from exhaust and stores it underground or uses it in industrial processes. Major investments from governments and private sector are accelerating development. Climate scientists see carbon capture as necessary alongside renewable energy to meet climate goals.",
    source: "Climate Technology Update",
    date: "2025-01-06"
  },
  {
    title: "Wearable Health Devices Enable Proactive Healthcare",
    content: "Advanced wearable devices are providing continuous health monitoring and early warning of medical issues. The technology can detect heart rhythm abnormalities, sleep disorders, and signs of infection. Healthcare providers are integrating wearable data into patient care plans. Health technology experts see wearables as essential for shifting from reactive to proactive healthcare.",
    source: "Health Technology Today",
    date: "2025-01-07"
  },
  {
    title: "Cryptocurrency Regulation Framework Takes Shape",
    content: "Governments worldwide are implementing comprehensive regulatory frameworks for cryptocurrency markets. The regulations aim to protect investors while allowing innovation in digital finance to continue. Major cryptocurrency exchanges are adapting to comply with new requirements. Financial analysts see regulation as a step toward mainstream adoption of digital assets.",
    source: "Digital Finance Report",
    date: "2025-01-08"
  },
  {
    title: "Autonomous Vehicle Testing Expands on Public Roads",
    content: "Self-driving vehicle companies are expanding testing programs on public roads following safety improvements. The technology has demonstrated significant reduction in accident rates compared to human drivers. Regulatory agencies are developing frameworks for broader deployment of autonomous vehicles. Transportation experts predict autonomous vehicles will transform mobility within the next decade.",
    source: "Autonomous Vehicle News",
    date: "2025-01-09"
  },
  {
    title: "Green Building Standards Become Mandatory in Major Cities",
    content: "Cities are implementing mandatory green building standards for new construction and major renovations. The regulations require energy-efficient design, sustainable materials, and renewable energy integration. Building costs have decreased as green technology becomes more mainstream. Urban planners see green building requirements as essential for meeting climate commitments.",
    source: "Sustainable Building Report",
    date: "2025-01-10"
  },
  {
    title: "Artificial Intelligence Ethics Guidelines Adopted Globally",
    content: "International organizations have adopted comprehensive guidelines for ethical development and deployment of AI systems. The framework addresses bias, transparency, accountability, and privacy concerns in AI applications. Technology companies are implementing ethics review processes for AI projects. AI researchers welcome the guidelines as important for building public trust in the technology.",
    source: "AI Ethics Review",
    date: "2025-01-11"
  },
  {
    title: "Remote Work Transformation Reshapes Office Real Estate",
    content: "The permanent shift to hybrid and remote work is transforming commercial real estate markets worldwide. Companies are reducing office footprint while investing in collaboration spaces and technology. Suburban and secondary cities are seeing growth as workers relocate from major urban centers. Real estate analysts predict continued evolution of workplace design and location strategies.",
    source: "Commercial Real Estate Today",
    date: "2025-01-12"
  },
  {
    title: "Microplastic Cleanup Technology Shows Environmental Promise",
    content: "New technologies designed to remove microplastics from water and soil are showing encouraging results. The systems use various methods including filtration, chemical treatment, and biological processes. Environmental scientists report measurable reduction in microplastic pollution in treated areas. Conservation organizations are calling for scaled deployment of cleanup technology.",
    source: "Environmental Cleanup Report",
    date: "2025-01-13"
  },
  {
    title: "Digital Identity Systems Enable Secure Online Services",
    content: "Governments and tech companies are developing digital identity systems for secure online authentication. The technology allows individuals to prove their identity without sharing sensitive personal information. Applications include government services, financial transactions, and healthcare access. Privacy advocates emphasize the need for user control over personal data in digital identity systems.",
    source: "Digital Identity News",
    date: "2025-01-14"
  },
  {
    title: "Plant-Based Food Market Continues Strong Growth",
    content: "The plant-based food industry continues to expand with new products and improved taste profiles. Major food companies are investing in plant-based alternatives for meat, dairy, and eggs. Consumer adoption is driven by health, environmental, and animal welfare concerns. Food industry analysts predict plant-based products will capture significant market share in coming years.",
    source: "Food Industry Analysis",
    date: "2025-01-15"
  },
  {
    title: "Precision Agriculture Improves Farm Sustainability",
    content: "Precision agriculture technologies are helping farmers reduce resource use while maintaining crop yields. Sensors, drones, and data analytics enable targeted application of water, fertilizers, and pesticides. The approach reduces environmental impact and improves farm profitability. Agricultural experts see precision farming as essential for sustainable food production.",
    source: "Agricultural Technology Today",
    date: "2025-01-16"
  },
  {
    title: "Neural Interface Technology Advances for Medical Applications",
    content: "Brain-computer interface technology is advancing for treatment of paralysis and neurological disorders. The devices enable direct communication between the brain and external devices. Clinical trials have shown promising results for restoring movement and communication abilities. Neuroscience researchers are optimistic about therapeutic applications of neural interface technology.",
    source: "Neurotechnology Review",
    date: "2025-01-17"
  }
];

/**
 * Fetch articles from RSS feeds
 */
async function fetchFromRSS(maxArticles = 50) {
  const articles = [];
  
  for (const feed of NEWS_FEEDS) {
    if (articles.length >= maxArticles) break;
    
    try {
      console.log(`📰 Fetching from ${feed.name}...`);
      const feedData = await parser.parseURL(feed.url);
      
      for (const item of feedData.items.slice(0, 10)) {
        if (articles.length >= maxArticles) break;
        
        const content = item.contentSnippet || item.content || item.summary || item.description || '';
        
        if (content.length > 50) {
          articles.push({
            title: item.title || 'Untitled',
            content: cleanText(content),
            link: item.link,
            source: feed.name,
            pubDate: item.pubDate || new Date().toISOString(),
          });
        }
      }
      
      console.log(`  ✓ Got ${Math.min(10, feedData.items.length)} articles`);
    } catch (error) {
      console.warn(`  ⚠ Failed to fetch ${feed.name}: ${error.message}`);
    }
  }
  
  return articles;
}

/**
 * Use fallback static news data
 */
function getFallbackNews(maxArticles = 50) {
  console.log('📦 Using fallback news data...');
  return FALLBACK_NEWS.slice(0, maxArticles).map(article => ({
    title: article.title,
    content: article.content,
    source: article.source,
    pubDate: article.date,
    link: '#',
  }));
}

/**
 * Clean and normalize text
 */
function cleanText(text) {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\x20-\x7E\n]/g, '') // Remove non-ASCII
    .trim();
}

/**
 * Split text into chunks with overlap
 */
function chunkText(text, chunkSize = config.rag.chunkSize, overlap = config.rag.chunkOverlap) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + chunkSize;
    
    // Try to end at a sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      if (lastPeriod > start + chunkSize / 2) {
        end = lastPeriod + 1;
      }
    }
    
    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }
  
  return chunks.filter(chunk => chunk.length > 20);
}

/**
 * Process articles into chunks for vector store
 */
function processArticles(articles) {
  const documents = [];
  
  for (const article of articles) {
    const fullText = `${article.title}\n\n${article.content}`;
    const chunks = chunkText(fullText);
    
    for (let i = 0; i < chunks.length; i++) {
      documents.push({
        text: chunks[i],
        metadata: {
          title: article.title,
          source: article.source,
          pubDate: article.pubDate,
          link: article.link,
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      });
    }
  }
  
  return documents;
}

/**
 * Main ingestion function
 */
async function ingestNews(maxArticles = 50) {
  console.log(`
🔄 Starting News Ingestion
━━━━━━━━━━━━━━━━━━━━━━━━━━
Target: ${maxArticles} articles
  `);
  
  let articles = [];
  
  // Try to fetch from RSS feeds
  try {
    articles = await fetchFromRSS(maxArticles);
    console.log(`\n✅ Fetched ${articles.length} articles from RSS feeds`);
  } catch (error) {
    console.warn('⚠ RSS fetching failed:', error.message);
  }
  
  // Use fallback if not enough articles
  if (articles.length < 10) {
    console.log('⚠ Not enough articles from RSS, using fallback data');
    articles = getFallbackNews(maxArticles);
  }
  
  if (articles.length === 0) {
    console.error('❌ No articles to ingest');
    return;
  }
  
  console.log(`\n📝 Processing ${articles.length} articles into chunks...`);
  const documents = processArticles(articles);
  console.log(`   Created ${documents.length} document chunks`);
  
  console.log('\n🧠 Generating embeddings and storing...');
  await vectorStore.initialize();
  await vectorStore.clear();
  
  // Process in batches to avoid overwhelming the embedding API
  const batchSize = 10;
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await vectorStore.addDocuments(batch);
    console.log(`   Processed ${Math.min(i + batchSize, documents.length)}/${documents.length} chunks`);
  }
  
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ingestion Complete!
📚 Total documents: ${documents.length}
📰 Sources: ${[...new Set(articles.map(a => a.source))].join(', ')}
  `);
}

// Run if executed directly
if (require.main === module) {
  ingestNews()
    .then(() => {
      console.log('Ingestion script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ingestion script failed:', error);
      process.exit(1);
    });
}

module.exports = { ingestNews, fetchFromRSS, processArticles };
