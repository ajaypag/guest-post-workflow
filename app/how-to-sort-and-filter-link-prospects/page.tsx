'use client';

import { useState } from 'react';
import Image from 'next/image';
import BlogPostTemplate from '@/components/BlogPostTemplate';
import { ChevronRight, Filter, Trash2, CheckCircle, XCircle, AlertCircle, Users, Globe, FileSpreadsheet, Link2 } from 'lucide-react';

// Optimized Image Component with lazy loading and performance features
interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
}

const OptimizedImage = ({ src, alt, width, height, className = "", priority = false }: OptimizedImageProps) => (
  <Image
    src={src}
    alt={alt}
    width={width}
    height={height}
    className={`rounded-lg shadow-md ${className}`}
    loading={priority ? "eager" : "lazy"}
    priority={priority}
    quality={85}
    placeholder="blur"
    blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
  />
);

export default function HowToSortAndFilterLinkProspectsPage() {
  const [activeSection, setActiveSection] = useState('');
  const [imagesLoaded, setImagesLoaded] = useState(0);

  const tableOfContents = [
    { id: "pre-stage", title: "Pre-stage of getting your spreadsheet ready", icon: FileSpreadsheet },
    { id: "referring-pages", title: "What referring pages to remove?", icon: Trash2 },
    { id: "pseudo-prospects", title: "Which URLs are pseudo link prospects?", icon: AlertCircle },
    { id: "low-authority", title: "Should you target low authority domains?", icon: Globe },
    { id: "nofollow-links", title: "Can nofollow backlinks be valuable?", icon: Link2 },
    { id: "abandoned-blogs", title: "Dealing with abandoned blogs", icon: Users },
    { id: "guest-posts", title: "What about guest posts?", icon: Users },
  ];

  return (
    <BlogPostTemplate
      title="How to Sort and Filter Link Prospects"
      metaDescription="Complete guide to sorting and filtering link prospects for effective outreach. Learn to identify quality opportunities and avoid time-wasters."
      publishDate="November 15, 2022"
      author="Ajay Paghdal"
      readTime="18 min read"
    >
      {/* Hero Section with Featured Image */}
      <div className="relative mb-12">
        <OptimizedImage
          src="https://www.linkio.com/wp-content/uploads/2020/11/sorting-link-prospects-fi-1024x536.png"
          alt="How to Sort and Filter Link Prospects - Complete Guide"
          width={1024}
          height={536}
          className="w-full h-[400px] object-cover"
          priority={true}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent rounded-lg" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-8 h-8" />
            <span className="text-sm font-medium bg-blue-600 px-3 py-1 rounded-full">
              Link Building Strategy
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How to Sort and Filter Link Prospects</h1>
          <p className="text-lg text-blue-100 max-w-3xl">
            Turn your messy spreadsheet into a goldmine of opportunities. Learn the insider tactics for identifying quality link prospects and avoiding time-wasters.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="bg-white rounded-lg p-6 border border-blue-200 shadow-sm">
          <div className="text-3xl font-bold text-blue-600 mb-2">31%</div>
          <div className="text-gray-600">Of prospects are actually worth pursuing</div>
        </div>
        <div className="bg-white rounded-lg p-6 border border-purple-200 shadow-sm">
          <div className="text-3xl font-bold text-purple-600 mb-2">40%</div>
          <div className="text-gray-600">Are duplicate or reposted content</div>
        </div>
        <div className="bg-white rounded-lg p-6 border border-green-200 shadow-sm">
          <div className="text-3xl font-bold text-green-600 mb-2">5%</div>
          <div className="text-gray-600">Of nofollow links drive real traffic</div>
        </div>
      </div>

      {/* Introduction */}
      <div className="prose prose-lg max-w-none mb-12">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg mb-8">
          <p className="text-lg font-medium text-gray-800 mb-3">
            <strong>Got stuck sorting out your link prospects?</strong>
          </p>
          <p className="text-gray-700 mb-4">
            Every other guide out there suggests that you should rely on the domain authority, relevance, traffic, and social signals. The higher, the better.
          </p>
          <p className="text-gray-700">
            While there's absolutely nothing wrong with such advice, it's the tip of the iceberg.
          </p>
        </div>

        <p className="text-gray-700 leading-relaxed mb-6">
          Once you dig deeper into your spreadsheet with link prospects, you'll run into a bunch of controversies that no one explains how to deal with.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">Should you cross ALL the low-authority domains off your list? What if you're just starting out, and influencers ignore your outreach emails?</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">Are nofollow links ALWAYS no-go options? How about the fact that a backlink profile looks natural to Google only when it contains both dofollow and nofollow links?</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">Is there a way to distinguish bloggers with a genuine interest in content from time-wasters?</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">I could go on with arguable points like these... But let me shed some light on them instead.</p>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed mb-6">
          This chapter talks about how to sort out link prospects in your sheet and beyond it. No superficial info – I'll guide you through the process from the inside, where confusion arises all the time.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg mb-8">
          <p className="text-gray-700">
            We also have a free backlink filtering tool that will save you hours on sorting through your list of prospects. You can test drive it here or use the dedicated page for a more clutter-free workspace.
          </p>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="bg-gray-50 rounded-lg p-6 mb-12">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-gray-600" />
          What You'll Learn
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tableOfContents.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSection(item.id);
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  activeSection === item.id 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-white border border-gray-200 hover:border-blue-200'
                }`}
              >
                <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium">{item.title}</span>
                <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Section 1: Pre-stage */}
      <section id="pre-stage" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-blue-600" />
          Pre-stage of getting your spreadsheet with link prospects ready
        </h2>
        
        <p className="text-gray-700 mb-6">
          But first things first. If you haven't prepared a spreadsheet with your link prospects yet, follow these three easy steps.
        </p>

        <div className="space-y-8 mb-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              0.1
            </div>
            <div>
              <h4 className="font-semibold mb-2">Go to your backlink checker and export backlinks to your competing pages.</h4>
              <p className="text-gray-700 mb-4">
                Just like in the previous chapter, I'll stick with the example of needing link prospects for my compilation of keyword tools.
              </p>
              <p className="text-gray-700">
                For my research, I exported backlinks to 33 similar compilations, which totals 3,383 URLs.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              0.2
            </div>
            <div>
              <h4 className="font-semibold mb-2">Combine many spreadsheets into one following this easy, two-minute guide.</h4>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              0.3
            </div>
            <div>
              <h4 className="font-semibold mb-2">Keep columns with essential metrics</h4>
              <p className="text-gray-700 mb-4">
                Depending on your backlink checker (I use Ahrefs, as it's probably the best platform for SEO for SaaS at the moment, especially when it comes to link building), your sheet will contain a lot of columns to make you dizzy.
              </p>
              <p className="text-gray-700 mb-4">
                I suggest that you keep columns with the following metrics (or their analogs if you use a different tool):
              </p>
            </div>
          </div>
        </div>

        {/* Linked Domains Example */}
        <div className="mb-8">
          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/linked-domains.png"
            alt="Example of linked domains spreadsheet showing essential metrics"
            width={800}
            height={400}
            className="w-full max-w-4xl mx-auto"
          />
        </div>

        {/* Metrics List */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <ul className="space-y-3">
            <li className="flex">
              <span className="font-semibold w-32">DR</span>
              <span className="text-gray-700">(how strong a backlink profile of an entire referring domain is);</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">UR</span>
              <span className="text-gray-700">(how strong a backlink profile of a single referring page is);</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">Referring Page URL;</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">Referring Page Title;</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">Link URL</span>
              <span className="text-gray-700">(the URL of your competing page);</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">TextPre</span>
              <span className="text-gray-700">(a snippet of text that precedes a backlink anchor);</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">Link Anchor</span>
              <span className="text-gray-700">(a clickable snippet of text in a hyperlink);</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">TextPost</span>
              <span className="text-gray-700">(a snippet of text that follows a backlink anchor);</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">Type</span>
              <span className="text-gray-700">(dofollow or nofollow);</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">Language;</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">Traffic</span>
              <span className="text-gray-700">(how much traffic a referring page receives from Google's organic search monthly);</span>
            </li>
            <li className="flex">
              <span className="font-semibold w-32">Linked Domains</span>
              <span className="text-gray-700">(how many domains your target links out to via dofollow backlinks).</span>
            </li>
          </ul>
        </div>

        <p className="text-gray-700 mb-6">
          As for the rest, feel free to remove them. With too many columns in your sheet, you won't know where to look first. It's distracting.
        </p>

        <p className="text-gray-700">
          Now that you have all the necessary data in one place, let's start.
        </p>
      </section>

      {/* Section 2: What to Remove */}
      <section id="referring-pages" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Trash2 className="w-8 h-8 text-red-600" />
          What kind of referring pages should you get rid of?
        </h2>

        <p className="text-gray-700 mb-6">
          Dealing with your actual link prospects isn't the first step, as you might have expected. You'll be surprised to see how much trash your spreadsheet contains.
        </p>

        <p className="text-gray-700 mb-6">
          The crawler of your backlink checker can go into the deepest corners of the web and find links where you'd never imagine. My point is not all the URLs you see in your sheet are actual link prospects. Let's put on gloves and clean it up.
        </p>

        <p className="text-gray-700 mb-8">
          Check out what kind of referring pages you should get rid of at this stage.
        </p>

        <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg mb-8">
          <p className="text-lg font-semibold text-red-900 mb-2">
            ⚠️ Spoiler
          </p>
          <p className="text-red-800">
            Having filtered out referring pages in my sheet, I kept only almost 31% of them.
          </p>
        </div>

        {/* Spoiler Result Image */}
        <div className="mb-12">
          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/spoiler.png"
            alt="Filtering results showing 31% success rate after removing trash prospects"
            width={800}
            height={400}
            className="w-full max-w-3xl mx-auto"
          />
        </div>

        {/* 1.1 Foreign Language URLs */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-gray-600" />
            1.1. URLs of referring pages in foreign languages
          </h3>
          
          <p className="text-gray-700 mb-4">
            A German-speaking writer shouldn't suggest to the German-speaking audience that they check a post in Italian. Logically, most of them won't understand the copy.
          </p>

          <p className="text-gray-700 mb-4">
            That's why you don't need to contact authors of foreign-language posts with a link request. To find and remove them, sort your spreadsheet by language in a corresponding column.
          </p>

          <p className="text-gray-700 mb-4">
            At times, that column can be empty or even contain your target language code (en – English in my case), but pages are still foreign.
          </p>

          <p className="text-gray-700 mb-6">
            To detect such cases, scroll through the sheet and double-check the titles of your referring pages.
          </p>

          {/* Foreign Language Example */}
          <div className="mb-6">
            <OptimizedImage
              src="https://www.linkio.com/wp-content/uploads/2020/05/foreign-language.png"
              alt="Example of foreign language URLs to remove from link prospects"
              width={800}
              height={400}
              className="w-full max-w-3xl mx-auto"
            />
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-sm">
              <strong>Note.</strong> If you promote a product rather than content, you can gain backlinks from foreign-language pages. But make sure you have a localized version of your product page.
            </p>
          </div>
        </div>

        {/* 1.2 Duplicate URLs */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">1.2. URLs of duplicate referring pages</h3>
          
          <div className="bg-orange-50 rounded-lg p-6 mb-6 border border-orange-200">
            <p className="text-lg font-semibold text-orange-900 mb-2">
              This is the biggest category of unwanted URLs you'll have in your spreadsheet – 40% in my case.
            </p>
          </div>

          <p className="text-gray-700 mb-4">
            The web is full of duplicate pages, which end up in backlink databases eventually. The reasons for such a web pollution phenomenon vary.
          </p>

          <p className="text-gray-700 mb-4">
            Some writers repost their content on platforms like growthhackers.com and medium.com. It's called content syndication in marketing and is a good strategy indeed.
          </p>

          <p className="text-gray-700 mb-4">
            Others repost someone else's content because they don't have time, resources, or skills (excuses vary individually:) to produce their own.
          </p>

          <p className="text-gray-700 mb-6">
            Some bloggers don't even repost the entire copy. They just publish the first few paragraphs of the original or write a short overview of it. You can treat such cases as duplicates too.
          </p>

          <p className="text-gray-700 mb-4">
            While sorting out your sheet, you can come across reposts of:
          </p>

          <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-1">
            <li>referring pages;</li>
            <li>competing pages;</li>
            <li>other pages on competitors' blogs.</li>
          </ul>

          <p className="text-gray-700 mb-4">
            Since people who do reposts aren't actual authors, there's no need to reach out to them. They won't edit the original.
          </p>

          <p className="text-gray-700 mb-6">
            It's like changing interviewee's quotes in journalism – unethical and can have consequences if the word gets out.
          </p>

          <p className="text-gray-700 mb-6">
            All you can do here is identify duplicates and remove them asap. Here are three quick ways to do it right in your sheet. No need to click through each URL.
          </p>

          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-8">
            <p className="text-sm">
              <strong>Note.</strong> When removing duplicates, make sure you keep the original. As a rule, it will have a higher DR than reposts.
            </p>
          </div>

          {/* 1.2.1 Sort by Title */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold mb-4">1.2.1. Sort the data by title (Referring Page Title column).</h4>
            
            <p className="text-gray-700 mb-4">
              You may notice minor variations in titles of the same reposted page. It happens because some authors update their articles over time.
            </p>

            <p className="text-gray-700 mb-6">
              As shown below, there were 8 tools on the list at first. Later, the author added a few more and rephrased the title a bit.
            </p>

            {/* Rephrased Example */}
            <div className="mb-6">
              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/rephrased.png"
                alt="Example of rephrased titles showing variations of the same content"
                width={800}
                height={400}
                className="w-full max-w-3xl mx-auto"
              />
            </div>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6">
              <p className="text-sm">
                <strong>Tip.</strong> When you update your content, add minor changes to the title. Leave the main keyword as is, but rephrase the surrounding text. It will help you diversify your backlink anchors in the long run.
              </p>
            </div>

            <p className="text-gray-700 mb-4">
              In the previous step, you should have removed domains with the same name yet different TLDs for foreign languages.
            </p>

            <p className="text-gray-700 mb-4">
              I'm referring to cases like hostinger.pt for Portuguese, hostinger.ru for Russian, hostinger.co.id for Indonesian, etc.
            </p>

            <p className="text-gray-700">
              At this stage, you may still find domains with the same name and language yet different TLDs. Keep the URL with higher DR & UR metrics and delete the rest.
            </p>
          </div>

          {/* 1.2.2 Sort by Surrounding Text */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold mb-4">1.2.2. Sort the data by surrounding text (TextPre and TextPost columns).</h4>
            
            <p className="text-gray-700 mb-4">
              Many people who do reposts have a nasty habit of editing original titles. The most common scenario is adding blog names to the beginning of page titles.
            </p>

            <p className="text-gray-700 mb-4">
              Due to such edits, you won't be able to identify duplicates if you sort URLs by title. The good thing is there's another way out.
            </p>

            <p className="text-gray-700 mb-6">
              While page titles differ, backlink anchors and surrounding text remain the same, just like the rest of the content. So, you need to sort your sheet by the text preceding the anchor (TextPre) to see more identicals.
            </p>

            {/* TextPre Example */}
            <div className="mb-6">
              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/TextPre.png"
                alt="Example of using TextPre column to identify duplicate content"
                width={800}
                height={400}
                className="w-full max-w-3xl mx-auto"
              />
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
              <p className="text-sm">
                <strong>Note.</strong> Wonder why you should sort by the preceding text rather than anchors? The thing is identical anchors don't always signify duplicate content. Anchors can match when authors refer to brand names, entire post titles, or use natural language like "click here" or even keywords. But if the surrounding text differs, these are different articles.
              </p>
            </div>

            <p className="text-gray-700 mb-6">
              When a link stands at the beginning of a new paragraph, there'll be no preceding text. In such cases, sort the data by the text following the anchor. (TextPost).
            </p>

            <p className="text-gray-700 mb-4">
              To find more duplicates, check if anchors and surrounding text contain any of the following phrases:
            </p>

            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-1">
              <li>source;</li>
              <li>original;</li>
              <li>appeared first, etc.</li>
            </ul>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <p className="text-sm">
                <strong>Note.</strong> Phrases like "Source" don't necessarily indicate duplicates. Writers can use them to attribute to resources whose stats or quotes they borrowed for their articles. Better double-check such cases by clicking through referring pages.
              </p>
            </div>
          </div>

          {/* 1.2.3 Check for Popular Platforms */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold mb-4">1.2.3. Check your spreadsheet for the names of popular blogging platforms.</h4>
            
            <p className="text-gray-700 mb-4">
              Have you noticed that tons of duplicate URLs are hosted on BlogSpot? I bet you have.
            </p>

            <p className="text-gray-700 mb-4">
              This is a popular blogging platform where writers repost articles originally published on their blogs.
            </p>

            <p className="text-gray-700 mb-6">
              If you still have any URLs hosted there, feel free to remove them. Even if they're not duplicates, their metrics are still too miserable to get any value from. Check out URLs with a zero or near-zero DR below.
            </p>

            <p className="text-gray-700 mb-4">
              In fact, there's no need to reach out to owners of such BlogSpot pages. You can easily register there yourself and publish as many posts as you like.
            </p>

            <p className="text-gray-700 mb-4">
              BlogSpot isn't the only platform of this kind. In the example below, you can see that Startup Institute reposts content on Squarespace. So do Magnetika and others.
            </p>

            <p className="text-gray-700 mb-6">
              Here are more examples of such blogging platforms. Their names are mostly "blog" derivatives (bluxeblog, tblogz, blogolize), which will help you identify them at a glance.
            </p>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
              <p className="text-sm">
                <strong>Note.</strong> As you can see, many results have a high DR unlike pages hosted on BlogSpot and Squarespace. Don't let it mislead you. The reason for such an overrated DR is the imperfection of the tool I use, not the high quality of those pages. Ahrefs treats each subdomain on BlogSpot and Squarespace as a standalone domain, which makes sense. But they don't seem to keep track of all the blogging platforms out there, so they can't estimate DR correctly in such cases. No matter what the tool you use says, these are all low-quality pages you need to delete.
              </p>
            </div>
          </div>
        </div>

        {/* 1.3 Trash URLs */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">1.3. URLs of referring pages that look like trash</h3>
          
          <p className="text-gray-700 mb-4">
            Once you get done with all kinds of duplicates, you'll notice more trash in your spreadsheet.
          </p>

          <p className="text-gray-700 mb-6">
            The rule of thumb is to delete everything that doesn't look like a normal URL of a content page.
          </p>

          <div className="space-y-8">
            <div>
              <h4 className="text-lg font-semibold mb-3">1.3.1. Remove URL shorteners.</h4>
              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/shorteners.png"
                alt="Examples of URL shorteners to remove"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">1.3.2. Remove URLs with an IP instead of a domain name</h4>
              <p className="text-gray-700 mb-4">
                If you sort your sheet by the name of the referring page URL, such results will be at the top.
              </p>
              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/domain-name.png"
                alt="Examples of URLs with IP addresses instead of domain names"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto"
              />
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">1.3.3. Remove URLs of feeds, social networks, and content curation platforms.</h4>
              <p className="text-gray-700 mb-4">
                Such URLs typically include "feed," "rss," "@", or user names.
              </p>
              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/curation-platforms.png"
                alt="Examples of feed and social network URLs to remove"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto"
              />
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">1.3.4. Remove URLs that look like abracadabra.</h4>
              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/abracadabra.png"
                alt="Examples of nonsensical URLs to remove"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto"
              />
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-3">1.3.5. Remove URLs that are not meaningful content pages</h4>
              <p className="text-gray-700 mb-4">
                For easier identification, check your sheet for /site/, /search/, /find/, /comment/, /tag/, signup, login and the like.
              </p>
              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/meaningful.png"
                alt="Examples of non-meaningful content page URLs"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />
              <p className="text-gray-700 mb-4">
                Some referring pages can also have "domain.com" at the end of their URLs, as shown at the bottom of this screenshot.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-4">
                <p className="text-sm">
                  <strong>Note.</strong> In rare cases, sites use /tag/ in the URL structure of blog posts. Don't remove them from your list of link prospects.
                </p>
              </div>
              <p className="text-gray-700 mb-4">
                Pages related to coupons and promo codes are also subject to removal. Check URLs for anything like "coupon," "promo," "deal," "discount," "voucher," etc.
              </p>
              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/coupon.png"
                alt="Examples of coupon and promo code URLs to remove"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />
              <p className="text-gray-700">
                These are common examples of link trash for the SEO industry. You may find some other schemes, depending on your niche.
              </p>
            </div>
          </div>
        </div>

        {/* 1.4 Forums and Communities */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">1.4. URLs of referring pages from forums and communities</h3>
          
          <p className="text-gray-700 mb-4">
            To make it clear, I don't mind building links on forums, communities, and Q&A sites.
          </p>

          <p className="text-gray-700 mb-4">
            But since there's no need to contact anyone with a link request, you should remove such URLs from your outreach list.
          </p>

          <p className="text-gray-700 mb-6">
            They generally contain "forum," "thread," "community," "discussion," etc.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/forum.png"
            alt="Examples of forum and community URLs to remove"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto"
          />
        </div>

        {/* 1.5 Non-blog Pages */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">1.5. URLs of any pages but blog posts</h3>
          
          <p className="text-gray-700 mb-4">
            These are homepages, about pages, portfolios, product pages, etc.
          </p>

          <p className="text-gray-700 mb-4">
            To identify such URLs, check your sheet for /about/, /portfolio/, /product/, /service/, or simply by eye in the case of homepages.
          </p>

          <p className="text-gray-700 mb-4">
            People prefer linking to their partners and customer testimonials from homepages.
          </p>

          <p className="text-gray-700 mb-6">
            I hate to be the one who brings you bad news. But if you're not a well-known figure in your niche, your testimonials aren't in demand, sorry.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/any-pages.png"
            alt="Examples of non-blog page URLs to remove"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/testimonials.png"
            alt="Examples of testimonial page URLs"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto"
          />
        </div>

        {/* 1.6 Podcasts and Interviews */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">1.6. URLs of podcasts, webinars, and interviews</h3>
          
          <p className="text-gray-700 mb-4">
            This type of content is somewhat time-sensitive, at least from a link prospecting angle.
          </p>

          <p className="text-gray-700 mb-4">
            If someone recommended your competitor's article in an interview a while ago, you can't go back in time and change it.
          </p>

          <p className="text-gray-700 mb-4">
            What's done is done.
          </p>

          <p className="text-gray-700 mb-4">
            No one is going to edit an audio or video file, which makes it pointless to edit its transcript.
          </p>

          <p className="text-gray-700 mb-6">
            You can identify such pages by "episode," "podcast," "webinar," "interview," or interviewee's name in URLs.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/episode.png"
            alt="Examples of podcast and interview URLs to remove"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-sm">
              <strong>Note.</strong> You can reach out to interviewees and show your content. If they still talk about your topic, they may give you a mention in their future interviews. Or you can contact podcasters and arrange to participate in one of their upcoming episodes. But you won't be able to gain a backlink from past podcasts you have in the sheet.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Pseudo Link Prospects */}
      <section id="pseudo-prospects" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <AlertCircle className="w-8 h-8 text-orange-600" />
          Which good-looking URLs are pseudo link prospects?
        </h2>

        <p className="text-gray-700 mb-4">
          Got done with duplicates and other meaningless pages?
        </p>

        <p className="text-gray-700 mb-4">
          Take a one-minute break and welcome a new portion of trash masked behind good-looking URLs.
        </p>

        <p className="text-gray-700 mb-6">
          This time, the analysis of link prospects will go beyond your spreadsheet. You'll need to click through URLs and practice analytical thinking.
        </p>

        <p className="text-gray-700 mb-8">
          Here's what kind of referring pages will drop out at this stage.
        </p>

        {/* 2.1 Non-openers */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">2.1. Non-openers</h3>
          
          <p className="text-gray-700 mb-4">
            Check out the URLs below. In terms of structure and wording, they look pretty normal, don't they?
          </p>

          <p className="text-gray-700 mb-6">
            But good looks can be deceiving, especially in link prospecting. None of those URLs open for one reason or another:
          </p>

          <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-1">
            <li>the server is down (error 521);</li>
            <li>the page could not be found (error 404);</li>
            <li>the IP address could not be found;</li>
            <li>the domain name has expired;</li>
            <li>the website took too long to respond;</li>
            <li>the website couldn't provide a secure connection.</li>
          </ul>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/Non-openers.png"
            alt="Examples of non-opening URLs that should be removed"
            width={800}
            height={400}
            className="w-full max-w-3xl mx-auto mb-6"
          />

          <p className="text-gray-700 mb-4">
            Curious about how those pages got to your spreadsheet if they don't open?
          </p>

          <p className="text-gray-700 mb-4">
            Here's how it works.
          </p>

          <p className="text-gray-700 mb-4">
            The bot of your tool re-crawls URLs once in a while to check if links are still there. Since its database contains millions of URLs, it can't re-crawl every URL every day.
          </p>

          <p className="text-gray-700 mb-4">
            Due to such a delay, the bot can't learn about such issues immediately, so non-openers remain in the database for a while.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-sm">
              <strong>Note.</strong> Some issues can be temporary. Double-check later if any of those pages got back to normal.
            </p>
          </div>
        </div>

        {/* 2.2 Third-rate Content */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">2.2. URLs of referring pages with third-rate content</h3>
          
          <p className="text-gray-700 mb-4">
            Let me clarify the idea of blogger outreach to loot competitors' backlinks.
          </p>

          <p className="text-gray-700 mb-4">
            When you want someone to replace a backlink to your competitor's article with a link to yours, that person should deeply care about the content.
          </p>

          <p className="text-gray-700 mb-4">
            Content enthusiasts usually publish long-form guides, unique life hacks, studies based on their personal experience, etc.
          </p>

          <p className="text-gray-700 mb-4">
            Are bloggers who post a few paragraphs of basic info content enthusiasts? I doubt it. At least, not to the extent of wishing to replace a current backlink with a better one.
          </p>

          <p className="text-gray-700 mb-4">
            Nine times out of ten, a site that publishes short articles is nothing but a content farm.
          </p>

          <p className="text-gray-700 mb-4">
            Such companies hire a lot of low-paid writers who produce loads of third-rate content.
          </p>

          <p className="text-gray-700 mb-4">
            Since there's an SEO rule to link out to a few websites from each post, those writers pick the first page they find in Google. Whatever.
          </p>

          <p className="text-gray-700 mb-4">
            They don't respond to link requests or charge fees when they do.
          </p>

          <p className="text-gray-700 mb-6">
            Content farms usually don't reveal their writers' identities and publish articles under an unidentified admin in the bio section.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/admin-bio.png"
            alt="Example of generic admin bio indicating content farm"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-sm">
              <strong>Note.</strong> Don't make decisions based on the word count only. Some writers are skilled enough to fit their original ideas into a short piece of text. Skim through the text to figure out if the info is basic indeed and can be found in every other post in Google.
            </p>
          </div>
        </div>

        {/* 2.3 Rewrites */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">2.3. URLs of referring pages with rewrites</h3>
          
          <p className="text-gray-700 mb-4">
            Analyzing link prospects, you'll notice that some articles sound familiar to you. The so-called feeling of deja vu.
          </p>

          <p className="text-gray-700 mb-4">
            Such pages are close to duplicates, but they aren't. I wish they were... That way, you'd be able to identify them as quickly as you did earlier, by sorting your sheet by the text surrounding anchors.
          </p>

          <p className="text-gray-700 mb-4">
            What can disclose rewritten content is a double bio on the page.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/double-bio.png"
            alt="Example of double bio indicating rewritten content"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <p className="text-gray-700 mb-4">
            Or you can spot the same table of contents in different articles.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/same-table-of-contents.png"
            alt="Example of identical table of contents across different articles"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <p className="text-gray-700 mb-4">
            Check out the example below. It's not even a good-quality rewrite.
          </p>

          <p className="text-gray-700 mb-4">
            They just used a tool that automatically replaces words from the original with synonyms. The structure of sentences remains unchanged, though.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/re-written-content.png"
            alt="Example of poorly rewritten content with synonym replacement"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto"
          />
        </div>

        {/* 2.4 Mumbo Jumbo */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">2.4. URLs of referring pages with mumbo jumbo</h3>
          
          <p className="text-gray-700 mb-4">
            While gaining backlinks from short articles can be debatable, you don't need them from awful copy for sure.
          </p>

          <p className="text-gray-700 mb-6">
            I'm referring to articles with tons of grammatical errors. Commonly written by bad English speakers, they all sound like gibberish.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/awful-copy.png"
            alt="Example of poorly written content with grammatical errors"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto"
          />
        </div>

        {/* 2.5 Awful Typography */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">2.5. URLs of referring pages with awful typography</h3>
          
          <p className="text-gray-700 mb-4">
            Besides awful copy, you can stumble upon pages with awful typography. It devalues the content and your link prospects accordingly.
          </p>

          <p className="text-gray-700 mb-4">
            Now, riddle me that. How many paragraphs are there in the screenshot below? One?
          </p>

          <p className="text-gray-700 mb-6">
            It may blow your mind, but there are three more paragraphs under the first one. You need to strain your eyes to see them.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/invisible-typography.png"
            alt="Example of poor typography with invisible text"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <p className="text-gray-700 mb-4">
            This is the first time I've seen headings smaller than the text in paragraphs. ¯\_(ツ)_/¯
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/small-subheadings.png"
            alt="Example of headings smaller than body text"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <p className="text-gray-700 mb-4">
            Another example is a weird-looking menu that takes up the entire screen space. You can call it anything but user-friendly navigation.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/poor-navigation.png"
            alt="Example of poor website navigation taking up entire screen"
            width={600}
            height={300}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <p className="text-gray-700 mb-4">
            What makes it all especially ridiculous is the fact that those guys provide web design and development services.
          </p>

          <p className="text-gray-700">
            How about creating a user-friendly menu for your site, huh?
          </p>
        </div>
      </section>

      {/* Section 4: Low Authority Domains */}
      <section id="low-authority" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Globe className="w-8 h-8 text-purple-600" />
          Should you gain backlinks from domains with low authority?
        </h2>

        <p className="text-gray-700 mb-4">
          The main stumbling point in link prospecting is whether you should deal with domains that have a low authority score.
        </p>

        <p className="text-gray-700 mb-6">
          To answer this question, let's figure out what this metric is all about.
        </p>

        <p className="text-gray-700 mb-6">
          Many SEO tools have it but call it in different ways: Domain Authority, Domain Rating, Trust Flow, etc. Learn how they describe their metrics.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/majestic-trust-flow.png"
            alt="Majestic Trust Flow definition"
            width={400}
            height={200}
            className="w-full"
          />
          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/moz-domain-authority.png"
            alt="Moz Domain Authority definition"
            width={400}
            height={200}
            className="w-full"
          />
          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/ahrefs-domain-rating.png"
            alt="Ahrefs Domain Rating definition"
            width={400}
            height={200}
            className="w-full"
          />
        </div>

        <p className="text-gray-700 mb-4">
          While the names of this metric differ at each company, it's based on the same thing – backlinks and nothing else.
        </p>

        <p className="text-gray-700 mb-4">
          The problem is you can't get a clear idea about the entire domain quality from one angle only.
        </p>

        <p className="text-gray-700 mb-8">
          To understand its true value, you should analyze more metrics and people behind it.
        </p>

        {/* 3.1 Metrics-based Approach */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">3.1. Metrics-based approach</h3>
          
          <p className="text-gray-700 mb-4">
            If your SEO tool has a batch analysis feature, you're lucky. It'll save you a lot of time.
          </p>

          <p className="text-gray-700 mb-6">
            You won't have to analyze a lot of domains with a low DR one by one. Instead, add them all to your tool to get the necessary data in one go.
          </p>

          <p className="text-gray-700 mb-6">
            Here are the metrics that will tell you if a site is a worthy link prospect.
          </p>

          {/* Organic Traffic */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold mb-4">Organic Traffic</h4>
            
            <p className="text-gray-700 mb-4">
              Let me remind you of the main purpose of link building – the growth of search rankings and traffic.
            </p>

            <p className="text-gray-700 mb-4">
              Backlinks serve as proof that sites are good enough to rank in the top 10, from where they'll attract more visitors.
            </p>

            <p className="text-gray-700 mb-4">
              If Google ranks some sites high without tons of backlinks, that's freaking awesome! Such sites don't suck at all, as their low DR suggests.
            </p>

            <p className="text-gray-700 mb-6">
              Some of them can get hundreds and even thousands of monthly visitors.
            </p>

            <OptimizedImage
              src="https://www.linkio.com/wp-content/uploads/2020/05/low-dr-much-traffic.png"
              alt="Example of low DR sites with high traffic"
              width={800}
              height={400}
              className="w-full max-w-3xl mx-auto mb-4"
            />

            <p className="text-gray-700 mb-4">
              To compare, not all sites with a medium-to-high DR can boast of such traffic stats.
            </p>

            <p className="text-gray-700 mb-6">
              Regardless of their heavy backlinks profiles, they drive only a few hundred visitors per month. That's when this metric doesn't indicate true domain quality.
            </p>

            <OptimizedImage
              src="https://www.linkio.com/wp-content/uploads/2020/05/high-dr-less-traffic.png"
              alt="Example of high DR sites with low traffic"
              width={800}
              height={400}
              className="w-full max-w-3xl mx-auto"
            />
          </div>

          {/* Organic Keywords */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold mb-4">Organic Keywords</h4>
            
            <p className="text-gray-700 mb-4">
              Some sites with a low DR aren't of low quality – they are just new. Their owners haven't earned many backlinks yet to increase their authority.
            </p>

            <p className="text-gray-700 mb-4">
              Ranking in the top 10, from where most traffic comes, doesn't happen overnight either. That's why newcomers don't even get a hundred visitors per month, as a rule.
            </p>

            <p className="text-gray-700 mb-4">
              On the other hand, some of them can rank for hundreds of keywords in the top 100. If Google approves ranking a site, it's not a piece of crap for sure.
            </p>

            <p className="text-gray-700 mb-6">
              Besides traffic, always check how many organic keywords your link prospects with a low DR have.
            </p>

            <OptimizedImage
              src="https://www.linkio.com/wp-content/uploads/2020/05/low-dr-many-keywords.png"
              alt="Example of low DR sites ranking for many keywords"
              width={800}
              height={400}
              className="w-full max-w-3xl mx-auto mb-4"
            />

            <p className="text-gray-700">
              The sites above are still far from their goal, but they're already on their way. It's just a matter of time before they see a traffic boost.
            </p>
          </div>

          {/* Linked Domains */}
          <div className="mb-8">
            <h4 className="text-xl font-semibold mb-4">Linked Domains</h4>
            
            <p className="text-gray-700 mb-4">
              A high DR gives the impression that such a site can send you a lot of link juice. But is it always true?
            </p>

            <p className="text-gray-700 mb-4">
              The thing is a website's link juice spreads among all the domains it links out to via dofollow links.
            </p>

            <p className="text-gray-700 mb-6">
              The more linked domains your prospect has, the less link juice you'll receive.
            </p>

            <p className="text-gray-700 mb-4">
              Assuming that DR stands for the entire amount of a website's link juice, here's how it works on the example of crownmediatech.com:
            </p>

            <OptimizedImage
              src="https://www.linkio.com/wp-content/uploads/2020/05/low-dr-few-linked-domains.png"
              alt="Example of low DR site with few linked domains"
              width={400}
              height={200}
              className="w-full max-w-lg mx-auto mb-4"
            />

            <p className="text-gray-700 mb-4">
              8 (DR) / 6 (linked domains) = 1.33
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
              <p className="text-sm">
                <strong>Note.</strong> It's not the exact formula of Google's algorithm, but still gives a clear idea about link juice distribution.
              </p>
            </div>

            <p className="text-gray-700 mb-4">
              Now, let's compare how much link juice activerain.com with a high DR provides:
            </p>

            <OptimizedImage
              src="https://www.linkio.com/wp-content/uploads/2020/05/high-dr-many-linked-domains.png"
              alt="Example of high DR site with many linked domains"
              width={400}
              height={200}
              className="w-full max-w-lg mx-auto mb-4"
            />

            <p className="text-gray-700 mb-4">
              81 (DR) / 330,967 (linked domains) = 0.24
            </p>

            <p className="text-gray-700 mb-4">
              As you can see, crownmediatech.com with DR 8 can send more link juice than activerain.com with DR 81:
            </p>

            <p className="text-gray-700 mb-6 font-semibold">
              1.33 vs 0.24.
            </p>

            <p className="text-gray-700">
              To conclude, you don't always need to approach sites with a high DR to get a lot of link juice your way.
            </p>
          </div>
        </div>

        {/* 3.2 Bloggers-based Approach */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold mb-4">3.2. Bloggers-based approach</h3>
          
          <p className="text-gray-700 mb-4">
            No doubt, metrics can give useful clues about a website's overall performance. But link prospecting isn't a math lesson to use figures only.
          </p>

          <p className="text-gray-700 mb-4">
            What if your prospects fall short of all the key metrics?
          </p>

          <p className="text-gray-700 mb-4">
            Don't erase them from your spreadsheet straightaway! Learn more about people behind your target domains to understand if they can be of any value to you.
          </p>

          <p className="text-gray-700 mb-8">
            You may find a few hidden gems among them.
          </p>

          {/* Prospect Examples */}
          <div className="space-y-8">
            {/* Sam Partland Example */}
            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg">
              <h4 className="text-lg font-semibold text-green-900 mb-4">✅ Prospect</h4>
              
              <p className="text-gray-700 mb-4">
                Let's take sammyseo.com as an example. It looks like a no-go in terms of metrics: no traffic, 3 organic keywords, and near-zero DR.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/sammyseo.com-stats.png"
                alt="Sam Partland's website statistics showing low metrics"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700 mb-4">
                While this domain sucks, its owner doesn't. According to LinkedIn, Sam Partland is a director of DigiSearch and was previously the head of growth at Urban.com.au.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/sam-partland-linkedin.png"
                alt="Sam Partland's LinkedIn profile"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700 mb-4">
                No wonder he's not too active with his blog.
              </p>

              <p className="text-gray-700 mb-4">
                With such an impressive work record, Sam is the right guy to build relationships with. The chances are he'll reward you with a backlink from a better performing domain, digisearch.com, one day.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/digisearch.com-stats.png"
                alt="DigiSearch website statistics showing better metrics"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700 mb-4">
                Besides LinkedIn, Twitter can also give you insights into your link prospects' background.
              </p>

              <p className="text-gray-700 mb-4">
                Sam's following isn't big, but let's scroll down a bit.
              </p>

              <p className="text-gray-700 mb-4">
                One of his latest posts got a retweet from a niche influencer with 66.2K followers, which proves he has a knack for SEO.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/sam-partland-twitter.png"
                alt="Sam Partland's Twitter profile and activity"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto"
              />
            </div>

            {/* Michelle Burson Example */}
            <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg">
              <h4 className="text-lg font-semibold text-green-900 mb-4">✅ Prospect</h4>
              
              <p className="text-gray-700 mb-4">
                Another example is marcomm.io that doesn't look promising due to its miserable metrics.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/marcomm.io-stats.png"
                alt="MarComm website statistics showing low metrics"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700 mb-4">
                Let's check a LinkedIn profile of its co-founder, Michelle Burson. She launched this site about a year and a half ago with her partner.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/michelle-burson-linkedin.png"
                alt="Michelle Burson's LinkedIn profile"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700 mb-4">
                Just like many other startups, MarComm founders probably don't have resources for heavy link building. And there's no other way to grow a DR.
              </p>

              <p className="text-gray-700 mb-4">
                But while their domain is relatively new, Michelle isn't a newbie in the business. She's been a marketing manager since 2007 and eventually founded her own company. Way to go!
              </p>

              <p className="text-gray-700">
                You should welcome people like her on your outreach list.
              </p>
            </div>

            {/* No-go Examples */}
            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg">
              <h4 className="text-lg font-semibold text-red-900 mb-4">❌ No-go</h4>
              
              <p className="text-gray-700 mb-4">
                Another underperforming domain that came my way is elccopywriting.com.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/elccopywriting.com-stats.png"
                alt="ELC Copywriting website statistics"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700 mb-4">
                The first thing that catches the eye on the homepage is its niche. Erika who owns the blog does content writing for beauty and personal care.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/elccopywriting.com-homepage.png"
                alt="ELC Copywriting homepage showing beauty niche focus"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700 mb-4">
                Unless it's your target niche, making friends with her won't get you anywhere.
              </p>

              <p className="text-gray-700">
                Whether she links to you from her blog or guest posts on beauty sites, such backlinks will be irrelevant to your domain.
              </p>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg">
              <h4 className="text-lg font-semibold text-red-900 mb-4">❌ No-go</h4>
              
              <p className="text-gray-700 mb-4">
                Renovatiocms.com doesn't look promising regarding both the key SEO metrics and visual appeal.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/renovatiocms.com-stats.png"
                alt="Renovatio CMS website statistics"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700 mb-4">
                The outdated design suggests this site is not new. Enter archive.org to find out how long it's been around.
              </p>

              <OptimizedImage
                src="https://www.linkio.com/wp-content/uploads/2020/05/renovatiocms.com-archive.org_.png"
                alt="Archive.org showing Renovatio CMS history from 2010"
                width={600}
                height={300}
                className="w-full max-w-2xl mx-auto mb-4"
              />

              <p className="text-gray-700">
                Well, the history dates back to 2010. If no one from their marketing department has grown its DR for 10 years, most likely no one will 🙂
              </p>
            </div>
          </div>

          <p className="text-gray-700 mt-8 mb-4">
            The bottom line is, you should analyze your link prospects from different angles to make the right decision. It'll be good practice for your analytical thinking.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-4">
            <p className="text-sm">
              <strong>Note.</strong> While sites with a low DR don't look promising, their owners usually turn out more responsive. Unlike bigwigs, they haven't become cocky yet, and building connections with new people is on their priority list.
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <p className="text-sm">
              <strong>Tip.</strong> Your choice of link prospects should depend on the quality of articles you're going to promote. Have you discovered anything eye-opening as a result of a massive study? Such content definitely deserves the attention of thought leaders. If all you have is a banal rewrite of well-known facts, it makes no sense to approach the big league. They already know everything you're trying to knock into their heads, and won't waste time on you. Better focus on weaker domains in such a case.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Nofollow Links */}
      <section id="nofollow-links" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Link2 className="w-8 h-8 text-green-600" />
          Can link prospects providing nofollow backlinks be of any value?
        </h2>

        <p className="text-gray-700 mb-6">
          The value of nofollow links is a matter of dispute in SEO circles. To cut a long story short, let's consider the pros and cons of such links.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg">
            <h4 className="text-lg font-semibold text-red-900 mb-3">❌ Con</h4>
            <p className="text-gray-700">
              They don't pass any link juice and therefore can't improve search rankings. You can build hundreds of nofollow links, but neither your domain authority nor organic traffic will grow as a result.
            </p>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg">
            <h4 className="text-lg font-semibold text-green-900 mb-3">✅ Pro #1</h4>
            <p className="text-gray-700">
              Technically, nofollow links don't have a direct impact on rankings. But they can still bring you visitors who, in turn, can link to you via dofollow links.
            </p>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg mb-8">
          <h4 className="text-lg font-semibold text-green-900 mb-3">✅ Pro #2</h4>
          <p className="text-gray-700 mb-4">
            Google thinks a natural backlink profile should consist of both nofollow and dofollow links.
          </p>
          <p className="text-gray-700 mb-4">
            Do they have a point? Let's think. How high are the chances that everyone will link to you via dofollow links without any actions on your part?
          </p>
          <p className="text-gray-700 mb-4">
            Not much chance!
          </p>
          <p className="text-gray-700 mb-4">
            Gaining only dofollow links will look like some sort of manipulation to Google.
          </p>
          <p className="text-gray-700">
            And all the manipulations have the same ending – penalties, from a decline in rankings to the entire ban from organic search. This is not what you need, believe me.
          </p>
        </div>

        <div className="bg-purple-50 border-l-4 border-purple-400 p-6 rounded-r-lg mb-8">
          <h4 className="text-lg font-semibold text-purple-900 mb-3">⚖️ Verdict</h4>
          <p className="text-gray-700 mb-4">
            Based on the above reasoning, you should reach out to bloggers that link out via nofollow links, but not all of them...
          </p>
          <p className="text-gray-700 mb-4">
            Regardless of the pros, the con is still weighty.
          </p>
          <p className="text-gray-700">
            Nofollow links can't help with organic traffic, and if they have no referral traffic potential, they are absolutely useless.
          </p>
        </div>

        <p className="text-gray-700 mb-4">
          I suggest that you limit your prospects' list of nofollow links to pages driving organic traffic.
        </p>

        <p className="text-gray-700 mb-4">
          The logic is simple here.
        </p>

        <p className="text-gray-700 mb-4">
          If someone clicks to a page from Google search, they may click to your link too. If no one visits that page, getting referral traffic is out of the question.
        </p>

        <p className="text-gray-700 mb-6">
          Sort pages with nofollow links by traffic and remove URLs that don't have any.
        </p>

        <OptimizedImage
          src="https://www.linkio.com/wp-content/uploads/2020/05/nofollow-links.png"
          alt="Examples of nofollow links in spreadsheet"
          width={800}
          height={400}
          className="w-full max-w-3xl mx-auto mb-6"
        />

        <p className="text-gray-700 mb-4">
          No worries, you won't have too many link prospects of this kind. So, it won't take too long to send them outreach emails.
        </p>

        <p className="text-gray-700 mb-6">
          According to my study, no more than 5% of pages with nofollow links usually have organic traffic.
        </p>

        <OptimizedImage
          src="https://www.linkio.com/wp-content/uploads/2020/05/nofollow-links-traffic-chart.png"
          alt="Chart showing 5% of nofollow links have organic traffic"
          width={600}
          height={300}
          className="w-full max-w-2xl mx-auto"
        />
      </section>

      {/* Section 6: Abandoned Blogs */}
      <section id="abandoned-blogs" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Users className="w-8 h-8 text-orange-600" />
          Should you deal with blogs that haven't been updated since last year or earlier?
        </h2>

        <p className="text-gray-700 mb-4">
          Once you clean all the trash off your sheet, you'll need to add one more column with the last blog update. It will help you identify abandoned domains and remove them.
        </p>

        <OptimizedImage
          src="https://www.linkio.com/wp-content/uploads/2020/05/last-update-column.png"
          alt="Spreadsheet column showing last update dates"
          width={800}
          height={400}
          className="w-full max-w-3xl mx-auto mb-6"
        />

        <p className="text-gray-700 mb-4">
          The main contenders for removal above are blogs with no updates for a year or so.
        </p>

        <p className="text-gray-700 mb-4">
          But just like any rule, this one has exceptions.
        </p>

        <p className="text-gray-700 mb-4">
          The lack of new content since last year doesn't always mean there's no life behind that domain.
        </p>

        <p className="text-gray-700 mb-6">
          Also, some blogs don't show publication dates at all, which makes it hard to tell anything about their publishing schedules.
        </p>

        <p className="text-gray-700 mb-8">
          Here are a few hacks to figure out if your target domain is still alive, and you can expect a reply.
        </p>

        {/* 5.1 Active Live Chat */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">5.1. Active live chat</h3>
          
          <p className="text-gray-700 mb-4">
            The last post on samadeyinka.com was published in November 2019 🙁
          </p>

          <p className="text-gray-700 mb-4">
            Too early to give up on it!
          </p>

          <p className="text-gray-700 mb-6">
            Look at the lower right corner of the layout. There's a live chat saying that Sam Adeyinka typically replies within a few hours. The blogger is still active regardless of such a long delay in his editorial calendar.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/samadeyinka.com-chat.png"
            alt="Sam Adeyinka's website showing active live chat"
            width={600}
            height={400}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-4">
            <p className="text-sm">
              <strong>Note.</strong> Pay attention to the date when the chat was last active.
            </p>
          </div>

          <p className="text-gray-700 mb-4">
            On peppyacademy.com, no one has used their live chat since fall, 2019. Neither have they published new content.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/peppyacademy.com-chat.png"
            alt="Peppy Academy website showing inactive live chat"
            width={600}
            height={400}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <p className="text-gray-700">
            You'll need to look for other signals of bloggers' activity, which brings us to the next hack.
          </p>
        </div>

        {/* 5.2 Recent Blog Comments */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">5.2. Recent blog comments</h3>
          
          <p className="text-gray-700 mb-4">
            The next place to check is a comments section at the bottom of blog posts if it's not disabled.
          </p>

          <p className="text-gray-700 mb-6">
            Readers comment on makealivingwriting.com and, most importantly, Carol Tice who owns the blog responds to them.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/makealivingwriting.com-comments.png"
            alt="Make a Living Writing blog showing active comments and responses"
            width={600}
            height={400}
            className="w-full max-w-2xl mx-auto"
          />
        </div>

        {/* 5.3 Post Titles with Current Year */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">5.3. Post titles with the current year mentions</h3>
          
          <p className="text-gray-700 mb-4">
            Check the titles of the latest blog posts for the current year.
          </p>

          <p className="text-gray-700 mb-6">
            Although youcanmakemoneyonlinenow.com has no publication dates, they posted an article about marketing trends for 2020. Looks like they've been active this year.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/youcanmakemoneyonlinenow.com-publishing-dates.png"
            alt="Website showing current year in post titles"
            width={600}
            height={400}
            className="w-full max-w-2xl mx-auto"
          />
        </div>

        {/* 5.4 Archives in Sidebar */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">5.4. Archives in the sidebar</h3>
          
          <p className="text-gray-700 mb-6">
            On some blogs, layouts have a sidebar with monthly archives of content. There, you can check the last month when new articles were published.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/archives-column.png"
            alt="Blog sidebar showing monthly archives"
            width={400}
            height={300}
            className="w-full max-w-lg mx-auto"
          />
        </div>

        {/* 5.5 Fresh Copyright Date */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">5.5. Fresh copyright date</h3>
          
          <p className="text-gray-700 mb-4">
            Scroll down to the footer to see if blog owners have updated the year in a copyright notice.
          </p>

          <p className="text-gray-700 mb-4">
            Is it still 2018 there? The chances of hearing back from them in 2020 are slim to none. Feel free to remove such link prospects from your sheet.
          </p>

          <p className="text-gray-700 mb-6">
            If they've edited the year like guys from bullsolutions.co.uk have, you can try your luck with them.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/bullsolutions.co_.uk-copyright.png"
            alt="Website footer showing updated copyright year"
            width={600}
            height={200}
            className="w-full max-w-2xl mx-auto"
          />
        </div>

        {/* 5.6 Active Social Media */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">5.6. Active social media profiles</h3>
          
          <p className="text-gray-700 mb-4">
            Are there no signs of life on your target domain? Head over to their social media profiles to check if things are different there.
          </p>

          <p className="text-gray-700 mb-4">
            The last article on blurbpointmedia.com dates back to March 2019, but their official Twitter account is quite active.
          </p>

          <p className="text-gray-700 mb-6">
            Read carefully what the tweet below says. Noticed? Now, they have a different domain blurbpoint.com, where they post more often.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/blurbpointmedia.com-twitter.png"
            alt="Twitter profile showing domain change and activity"
            width={600}
            height={400}
            className="w-full max-w-2xl mx-auto mb-4"
          />

          <p className="text-gray-700">
            That's what you can discover if you do a quick analysis of your link prospects.
          </p>
        </div>

        {/* 5.7 Current Occupation */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">5.7. Current occupation of blog owners</h3>
          
          <p className="text-gray-700 mb-4">
            When you have seemingly abandoned personal blogs on your list, look for answers on LinkedIn.
          </p>

          <p className="text-gray-700 mb-4">
            A common scenario is that their owners got a full-time job and have no time for their side projects anymore.
          </p>

          <p className="text-gray-700 mb-6">
            Brandi M Fleeks hasn't updated bellavitacontent.com for more than a year, but she hasn't abandoned it.
          </p>

          <p className="text-gray-700 mb-4">
            According to LinkedIn, she just switched to a different project a year ago. Her personal blog is still her property.
          </p>

          <OptimizedImage
            src="https://www.linkio.com/wp-content/uploads/2020/05/brandi-m-fleeks-linkedin.png"
            alt="Brandi M Fleeks LinkedIn profile showing job change"
            width={600}
            height={400}
            className="w-full max-w-2xl mx-auto"
          />
        </div>
      </section>

      {/* Section 7: Guest Posts */}
      <section id="guest-posts" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-600" />
          What should you do if your target referring page is a guest post?
        </h2>

        <p className="text-gray-700 mb-4">
          The next columns to add should include your link prospect's details, particularly the name, position, company, and whether that person is an in-house employee or a guest writer.
        </p>

        <OptimizedImage
          src="https://www.linkio.com/wp-content/uploads/2020/05/guest-author-columns.png"
          alt="Spreadsheet columns for guest author information"
          width={800}
          height={400}
          className="w-full max-w-3xl mx-auto mb-6"
        />

        <p className="text-gray-700 mb-4">
          You'll see that a bunch of pages on your list are guest posts.
        </p>

        <p className="text-gray-700 mb-6">
          Since guest authors don't own those domains, they have no access to the admin panel. It's beyond their power to edit their posts and embed your link there, even if they want to.
        </p>

        <p className="text-gray-700 mb-8">
          Shall you reach out to guest contributors anyways? It all depends on your purpose.
        </p>

        {/* Purpose #1 */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Purpose #1. Gaining a backlink to your blog post (from that specific page).</h3>
          
          <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg mb-4">
            <p className="text-gray-700 mb-4">
              Most likely, it's a no. Especially if you're not ready to reward guest writers in return.
            </p>
            <p className="text-gray-700 mb-4">
              No one will bother to contact blog editors and ask them for a link change. They already got what they wanted from those domains, and your weak backlink profile is your problem.
            </p>
            <p className="text-gray-700 mb-4">
              Editors aren't dumb either. They smell link manipulations a mile off and don't tolerate such things.
            </p>
            <p className="text-gray-700">
              It's all like chasing windmills – long and useless.
            </p>
          </div>
        </div>

        {/* Purpose #2 */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Purpose #2. Gaining a backlink to your product (from that specific page).</h3>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg mb-4">
            <p className="text-gray-700 mb-4">
              If there are guest posts strategically important for your business, be ready to sweat a bit.
            </p>
            <p className="text-gray-700 mb-4">
              A common example of such content is a compilation of competing products. Sure thing you want to get yours featured there too.
            </p>
            <p className="text-gray-700 mb-4">
              In such a case, you need to contact guest authors with an offer to test your tool. Make sure you create free accounts for them.
            </p>
            <p className="text-gray-700">
              No response? Then, reach out directly to blog editors or owners if editors don't reply either. Don't forget to provide free access for them.
            </p>
          </div>
        </div>

        {/* Purpose #3 */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Purpose #3. Gaining backlinks from guest writers' upcoming posts.</h3>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg mb-4">
            <p className="text-gray-700 mb-4">
              Face it, getting your backlinks embedded in older guest posts is almost impossible.
            </p>
            <p className="text-gray-700 mb-4">
              But why not reach out to people who do guest posting and make friends with them?
            </p>
            <p className="text-gray-700 mb-4">
              They publish content on multiple resources – guest blogs, sites they write on behalf, their personal resources, etc. These are all your potential link targets.
            </p>
            <p className="text-gray-700">
              The more people will check out your content, the more links you'll earn in the long run.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
          <p className="text-sm mb-4">
            <strong>Note.</strong> Check LinkedIn profiles of in-house writers to make sure they still work there. In rare cases, people remain in the same company for ages.
          </p>
          <p className="text-sm mb-4">
            For example, Zoe Stoller created content for Splat last year.
          </p>
          <p className="text-sm">
            But things changed in September 2019. She migrated to a different company and is still there.
          </p>
        </div>

        <OptimizedImage
          src="https://www.linkio.com/wp-content/uploads/2020/05/splatworld-content.png"
          alt="Example of content created by former employee"
          width={600}
          height={300}
          className="w-full max-w-2xl mx-auto mb-4"
        />

        <OptimizedImage
          src="https://www.linkio.com/wp-content/uploads/2020/05/zoe-stroller-linkedin.png"
          alt="Zoe Stoller's LinkedIn showing job change"
          width={600}
          height={300}
          className="w-full max-w-2xl mx-auto mb-6"
        />

        <p className="text-gray-700 mb-4">
          Just like guest writers, former employees can't edit their posts anymore.
        </p>

        <p className="text-gray-700 mb-6">
          But as Zoe is a content lead at Foyr now, you have an opportunity to get a backlink from that resource.
        </p>

        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
          <p className="text-sm mb-4">
            <strong>Exception.</strong> If you bump into guest posts by your competitor's team, feel free to remove such link prospects. They won't help you.
          </p>
          <p className="text-sm">
            On the other hand, you can approach owners of those domains to submit your own guest posts.
          </p>
        </div>
      </section>

      {/* Final Word Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 border border-blue-200 mb-12">
        <h2 className="text-3xl font-bold mb-4">Final Word</h2>
        <p className="text-lg mb-6 text-gray-700">
          As soon as you finish sorting out your link prospects and remove the trash, you'll come to a logical conclusion. They are not infinite, so you can't approach them carelessly and waste your opportunities.
        </p>
        <p className="text-gray-700 mb-6">
          Invest some time in polishing your outreach emails to get link prospects on your side. This is exactly what the next chapter of this blogger outreach guide will teach you.
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Download Prospect Template
          </button>
          <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors border border-blue-600">
            Read Next: Outreach Templates
          </button>
        </div>
      </section>

      {/* Related Resources */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">SEO and Link Building Resources</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Case Studies</span>
            <h3 className="font-semibold mt-3 mb-2">From Zero to Breakthrough: The Marketing Tactic That Made It Happen</h3>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Guides</span>
            <h3 className="font-semibold mt-3 mb-2">Best Rank Tracking Tools for Local Businesses: What Actually Matters?</h3>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Guides</span>
            <h3 className="font-semibold mt-3 mb-2">Using SEO For Lead Generation – Everything You Need To Know</h3>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Listicles</span>
            <h3 className="font-semibold mt-3 mb-2">The Best Books To Learn SEO Recommended by Pros</h3>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Case Studies</span>
            <h3 className="font-semibold mt-3 mb-2">How to Create a Content Marketing Strategy for eCommerce</h3>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">Guides</span>
            <h3 className="font-semibold mt-3 mb-2">Why Every Business Needs a Website</h3>
          </div>
        </div>
      </section>
    </BlogPostTemplate>
  );
}