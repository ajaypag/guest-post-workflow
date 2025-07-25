import { NextResponse } from 'next/server';
import { DataForSeoService } from '@/lib/services/dataForSeoService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domain, keywords, testMode = true } = body;

    if (!domain || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json({ 
        error: 'Invalid request. Domain and keywords array required.' 
      }, { status: 400 });
    }

    // Check for API credentials
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      return NextResponse.json({ error: 'DataForSEO credentials not configured' }, { status: 500 });
    }

    const auth = Buffer.from(
      `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
    ).toString('base64');

    // Test different keyword configurations
    const results: any[] = [];
    
    // Test 1: Single keyword at a time
    console.log('=== Testing single keywords ===');
    for (let i = 0; i < Math.min(keywords.length, 3); i++) {
      const singleKeywordFilter = [
        ["keyword_data.keyword", "like", `%${keywords[i]}%`]
      ];
      
      results.push({
        test: `Single keyword: "${keywords[i]}"`,
        keyword_count: 1,
        filter: singleKeywordFilter,
        request_body: [{
          target: domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''),
          location_code: 2840,
          language_code: 'en',
          filters: singleKeywordFilter,
          limit: testMode ? 10 : 500
        }]
      });
    }

    // Test 2: Progressive keyword addition
    console.log('=== Testing progressive keyword addition ===');
    for (let count = 2; count <= Math.min(keywords.length, 10); count++) {
      const selectedKeywords = keywords.slice(0, count);
      const filters = [];
      
      for (let i = 0; i < selectedKeywords.length; i++) {
        if (i > 0) {
          filters.push("or");
        }
        filters.push(["keyword_data.keyword", "like", `%${selectedKeywords[i]}%`]);
      }
      
      results.push({
        test: `${count} keywords combined`,
        keyword_count: count,
        keywords_used: selectedKeywords,
        filter: filters,
        request_body: [{
          target: domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''),
          location_code: 2840,
          language_code: 'en',
          filters: filters,
          limit: testMode ? 10 : 500
        }]
      });
    }

    // Test 3: Test with exact match vs partial match
    if (keywords.length >= 2) {
      const exactMatchFilter = [
        ["keyword_data.keyword", "=", keywords[0]],
        "or",
        ["keyword_data.keyword", "=", keywords[1]]
      ];
      
      results.push({
        test: 'Exact match test (2 keywords)',
        keyword_count: 2,
        keywords_used: keywords.slice(0, 2),
        filter: exactMatchFilter,
        request_body: [{
          target: domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, ''),
          location_code: 2840,
          language_code: 'en',
          filters: exactMatchFilter,
          limit: testMode ? 10 : 500
        }]
      });
    }

    // Actually run the tests if not in test mode
    if (!testMode) {
      for (const test of results) {
        try {
          const response = await fetch(
            'https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live',
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(test.request_body),
            }
          );

          const data = await response.json();
          test.response_status = response.status;
          test.response_ok = response.ok;
          
          if (data.tasks?.[0]) {
            test.task_status_code = data.tasks[0].status_code;
            test.task_status_message = data.tasks[0].status_message;
            test.result_count = data.tasks[0].result?.[0]?.items?.length || 0;
            test.total_count = data.tasks[0].result?.[0]?.total_count || 0;
            test.cost = data.tasks[0].cost;
            
            // Sample results
            if (data.tasks[0].result?.[0]?.items?.length > 0) {
              test.sample_results = data.tasks[0].result[0].items.slice(0, 3).map((item: any) => ({
                keyword: item.keyword_data?.keyword,
                position: item.ranked_serp_element?.serp_item?.rank_absolute,
                search_volume: item.keyword_data?.keyword_info?.search_volume
              }));
            }
          }
          
          // Add small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          test.error = error instanceof Error ? error.message : 'Unknown error';
        }
      }
    }

    // Analyze patterns
    const analysis = {
      keyword_count: keywords.length,
      tests_run: results.length,
      pattern_detected: false,
      issue_at_keyword_count: null as number | null,
      recommendations: [] as string[]
    };

    // Look for the drop-off point
    if (!testMode) {
      let previousCount = 0;
      for (const test of results) {
        if (test.result_count !== undefined) {
          if (previousCount > 0 && test.result_count < previousCount * 0.5) {
            analysis.pattern_detected = true;
            analysis.issue_at_keyword_count = test.keyword_count;
            break;
          }
          previousCount = test.result_count;
        }
      }
    }

    // Generate recommendations
    if (analysis.pattern_detected) {
      analysis.recommendations.push(
        `Results drop significantly at ${analysis.issue_at_keyword_count} keywords`,
        'Consider limiting keyword filters to 8 or fewer keywords',
        'Use multiple API calls for larger keyword sets',
        'Test with exact match (=) instead of partial match (like) for better results'
      );
    }

    return NextResponse.json({
      success: true,
      domain,
      keywords,
      test_mode: testMode,
      test_results: results,
      analysis,
      tip: testMode ? 'Set testMode to false to actually run the API calls' : null
    });

  } catch (error) {
    console.error('DataForSEO debug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}