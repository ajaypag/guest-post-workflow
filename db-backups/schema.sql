--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: page_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.page_type AS ENUM (
    'landing_page',
    'blog_post',
    'tool_page',
    'resource_page',
    'case_study',
    'other'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'bank_transfer',
    'credit_card',
    'paypal',
    'check',
    'cash',
    'stripe',
    'other'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded',
    'partial',
    'cancelled'
);


--
-- Name: recreation_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recreation_status AS ENUM (
    'identified',
    'analyzed',
    'in_progress',
    'completed',
    'published',
    'skipped'
);


--
-- Name: calculate_platform_fee(uuid, uuid, bigint, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_platform_fee(p_publisher_id uuid, p_website_id uuid, p_amount bigint, p_order_type character varying DEFAULT 'standard'::character varying) RETURNS TABLE(platform_fee bigint, commission_percent numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_commission_percent DECIMAL(5,2);
  v_platform_fee BIGINT;
BEGIN
  -- Get applicable commission rate (priority: publisher > website > global)
  SELECT COALESCE(
    -- Publisher-specific rate
    (SELECT base_commission_percent FROM commission_configurations 
     WHERE scope_type = 'publisher' AND scope_id = p_publisher_id 
     AND is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY created_at DESC LIMIT 1),
    -- Website-specific rate  
    (SELECT base_commission_percent FROM commission_configurations 
     WHERE scope_type = 'website' AND scope_id = p_website_id 
     AND is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY created_at DESC LIMIT 1),
    -- Global rate
    (SELECT base_commission_percent FROM commission_configurations 
     WHERE scope_type = 'global' AND scope_id IS NULL 
     AND is_active = true AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
     ORDER BY created_at DESC LIMIT 1),
    -- Fallback default
    30.00
  ) INTO v_commission_percent;
  
  -- Calculate fee
  v_platform_fee := ROUND(p_amount * v_commission_percent / 100);
  
  RETURN QUERY SELECT v_platform_fee, v_commission_percent;
END;
$$;


--
-- Name: create_publisher_earning_on_completion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_publisher_earning_on_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_platform_fee_info RECORD;
BEGIN
  -- Only process if status changed to 'completed' and publisher is assigned
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.publisher_id IS NOT NULL THEN
    
    -- Calculate platform fee
    SELECT * INTO v_platform_fee_info 
    FROM calculate_platform_fee(
      NEW.publisher_id,
      (SELECT website_id FROM publisher_offering_relationships 
       WHERE publisher_id = NEW.publisher_id LIMIT 1),
      NEW.publisher_price,
      'standard'
    );
    
    -- Create earnings record
    INSERT INTO publisher_earnings (
      publisher_id,
      order_line_item_id,
      order_id,
      earning_type,
      amount,
      gross_amount,
      platform_fee_percent,
      platform_fee_amount,
      net_amount,
      status,
      website_id,
      description
    ) VALUES (
      NEW.publisher_id,
      NEW.id,
      NEW.order_id,
      'order_completion',
      NEW.publisher_price,
      NEW.publisher_price,
      v_platform_fee_info.commission_percent,
      v_platform_fee_info.platform_fee,
      NEW.publisher_price - v_platform_fee_info.platform_fee,
      'pending',
      (SELECT website_id FROM publisher_offering_relationships 
       WHERE publisher_id = NEW.publisher_id LIMIT 1),
      'Earnings for completed order'
    );
    
    -- Update publisher status
    NEW.publisher_status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: websites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.websites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    airtable_id character varying(255),
    domain character varying(255) NOT NULL,
    domain_rating integer,
    total_traffic numeric(12,2),
    guest_post_cost numeric(10,2),
    categories text[],
    type text[],
    status character varying(50) DEFAULT 'Unknown'::character varying,
    has_guest_post boolean DEFAULT false,
    has_link_insert boolean DEFAULT false,
    published_opportunities integer DEFAULT 0,
    overall_quality character varying(255),
    airtable_created_at timestamp without time zone NOT NULL,
    airtable_updated_at timestamp without time zone NOT NULL,
    last_synced_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    website_type text[],
    niche text[],
    publisher_tier character varying(20) DEFAULT 'standard'::character varying,
    preferred_content_types text[],
    editorial_calendar_url text,
    content_guidelines_url text,
    typical_turnaround_days integer,
    accepts_do_follow boolean DEFAULT true,
    requires_author_bio boolean DEFAULT false,
    max_links_per_post integer,
    primary_contact_id uuid,
    publisher_company character varying(255),
    website_language character varying(10) DEFAULT 'en'::character varying,
    target_audience text,
    avg_response_time_hours numeric(10,2),
    success_rate_percentage numeric(5,2),
    last_campaign_date date,
    total_posts_published integer DEFAULT 0,
    internal_quality_score numeric(3,2),
    internal_notes text,
    account_manager_id uuid,
    organization_id uuid,
    normalized_domain character varying(255),
    source character varying(50) DEFAULT 'airtable'::character varying,
    added_by_publisher_id uuid,
    added_by_user_id uuid,
    source_metadata jsonb DEFAULT '{}'::jsonb,
    import_batch_id character varying(100),
    CONSTRAINT check_website_source CHECK (((source)::text = ANY ((ARRAY['airtable'::character varying, 'publisher'::character varying, 'internal'::character varying, 'api'::character varying, 'migration'::character varying, 'manual'::character varying, 'manyreach'::character varying])::text[])))
);


--
-- Name: COLUMN websites.publisher_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.publisher_tier IS 'Publisher tier level: basic, standard, premium, enterprise';


--
-- Name: COLUMN websites.preferred_content_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.preferred_content_types IS 'Types of content this website prefers';


--
-- Name: COLUMN websites.editorial_calendar_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.editorial_calendar_url IS 'URL to editorial calendar if available';


--
-- Name: COLUMN websites.content_guidelines_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.content_guidelines_url IS 'URL to content guidelines document';


--
-- Name: COLUMN websites.typical_turnaround_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.typical_turnaround_days IS 'Average days for content approval/publication';


--
-- Name: COLUMN websites.accepts_do_follow; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.accepts_do_follow IS 'Whether website accepts do-follow links';


--
-- Name: COLUMN websites.requires_author_bio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.requires_author_bio IS 'Whether author bio is required';


--
-- Name: COLUMN websites.max_links_per_post; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.max_links_per_post IS 'Maximum number of links allowed per post';


--
-- Name: COLUMN websites.primary_contact_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.primary_contact_id IS 'Primary contact person for this website';


--
-- Name: COLUMN websites.publisher_company; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.publisher_company IS 'Company that owns/manages this website';


--
-- Name: COLUMN websites.website_language; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.website_language IS 'Primary language of the website';


--
-- Name: COLUMN websites.target_audience; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.target_audience IS 'Description of target audience';


--
-- Name: COLUMN websites.avg_response_time_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.avg_response_time_hours IS 'Average response time in hours';


--
-- Name: COLUMN websites.success_rate_percentage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.success_rate_percentage IS 'Success rate for placements';


--
-- Name: COLUMN websites.last_campaign_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.last_campaign_date IS 'Date of last campaign with this website';


--
-- Name: COLUMN websites.total_posts_published; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.total_posts_published IS 'Total number of posts published';


--
-- Name: COLUMN websites.internal_quality_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.internal_quality_score IS 'Internal quality rating (0-5)';


--
-- Name: COLUMN websites.internal_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.internal_notes IS 'Internal notes about this website';


--
-- Name: COLUMN websites.account_manager_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.account_manager_id IS 'Assigned account manager';


--
-- Name: COLUMN websites.organization_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.organization_id IS 'Organization this website belongs to';


--
-- Name: COLUMN websites.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.source IS 'Source of website data: airtable, publisher, internal, api';


--
-- Name: COLUMN websites.added_by_publisher_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.added_by_publisher_id IS 'Publisher who added this website (if source=publisher)';


--
-- Name: COLUMN websites.added_by_user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.added_by_user_id IS 'Internal user who added this website (if source=internal)';


--
-- Name: COLUMN websites.source_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.source_metadata IS 'Additional metadata about the source (import details, API info, etc)';


--
-- Name: COLUMN websites.import_batch_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.websites.import_batch_id IS 'Batch identifier for bulk imports';


--
-- Name: find_website_by_domain(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_website_by_domain(input_domain text) RETURNS SETOF public.websites
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM websites 
    WHERE normalized_domain = normalize_domain(input_domain)
    LIMIT 1;  -- Return first match if duplicates exist
END;
$$;


--
-- Name: generate_placeholder_airtable_id(character varying, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_placeholder_airtable_id(source_type character varying, entity_id uuid) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
      BEGIN
        RETURN UPPER(source_type || '_' || 
                     TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS') || '_' || 
                     SUBSTRING(entity_id::TEXT, 1, 8));
      END;
      $$;


--
-- Name: get_publisher_pending_earnings(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_publisher_pending_earnings(p_publisher_id uuid) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(net_amount) 
     FROM publisher_earnings 
     WHERE publisher_id = p_publisher_id 
     AND status IN ('pending', 'confirmed')
     AND payment_batch_id IS NULL),
    0
  );
END;
$$;


--
-- Name: log_publisher_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_publisher_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
    INSERT INTO publisher_automation_logs (
      publisher_id,
      action,
      previous_data,
      new_data,
      metadata,
      created_at
    ) VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object('account_status', OLD.account_status),
      jsonb_build_object('account_status', NEW.account_status),
      jsonb_build_object(
        'changed_from', OLD.account_status,
        'changed_to', NEW.account_status,
        'trigger', 'database'
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: migrate_website_pricing_to_offerings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.migrate_website_pricing_to_offerings() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  website_record RECORD;
  publisher_record RECORD;
  offering_id UUID;
BEGIN
  -- For each website with a publisher and guest post cost
  FOR website_record IN 
    SELECT w.*, pw.publisher_id 
    FROM websites w
    JOIN publisher_websites pw ON w.id = pw.website_id
    WHERE w.guest_post_cost IS NOT NULL
  LOOP
    -- Create offering if publisher exists
    SELECT * INTO publisher_record FROM publishers WHERE id = website_record.publisher_id;
    
    IF publisher_record.id IS NOT NULL THEN
      -- Create guest post offering
      INSERT INTO publisher_offerings (
        publisher_id,
        offering_type,
        base_price,
        turnaround_days,
        is_active
      ) VALUES (
        publisher_record.id,
        'guest_post',
        website_record.guest_post_cost::INTEGER,
        7, -- default turnaround
        true
      ) RETURNING id INTO offering_id;
      
      -- Create relationship
      INSERT INTO publisher_offering_relationships (
        publisher_id,
        offering_id,
        website_id,
        is_primary,
        is_active
      ) VALUES (
        publisher_record.id,
        offering_id,
        website_record.id,
        true,
        true
      ) ON CONFLICT (publisher_id, website_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: normalize_domain(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_domain(input_domain text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $_$
DECLARE
    normalized TEXT;
BEGIN
    IF input_domain IS NULL OR input_domain = '' THEN
        RETURN NULL;
    END IF;
    
    -- Convert to lowercase
    normalized := LOWER(TRIM(input_domain));
    
    -- Remove protocol
    normalized := REGEXP_REPLACE(normalized, '^https?://', '');
    
    -- Remove www prefix (but keep other subdomains like blog, shop, etc)
    normalized := REGEXP_REPLACE(normalized, '^www\.', '');
    
    -- Remove trailing slash and path
    normalized := REGEXP_REPLACE(normalized, '/.*$', '');
    
    -- Remove port
    normalized := REGEXP_REPLACE(normalized, ':[0-9]+$', '');
    
    -- Remove any trailing dots
    normalized := RTRIM(normalized, '.');
    
    RETURN normalized;
END;
$_$;


--
-- Name: trigger_normalize_domain(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_normalize_domain() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.normalized_domain := normalize_domain(NEW.domain);
    RETURN NEW;
END;
$$;


--
-- Name: update_project_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Update counts for NEW project
        IF NEW.project_id IS NOT NULL THEN
          UPDATE bulk_analysis_projects SET
            domain_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id),
            qualified_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id AND qualification_status IN ('high_quality', 'good_quality', 'marginal_quality')),
            workflow_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = NEW.project_id AND has_workflow = true),
            last_activity_at = NOW()
          WHERE id = NEW.project_id;
        END IF;
        
        -- Also update old project if domain moved
        IF TG_OP = 'UPDATE' AND OLD.project_id IS NOT NULL AND OLD.project_id != NEW.project_id THEN
          UPDATE bulk_analysis_projects SET
            domain_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id),
            qualified_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND qualification_status IN ('high_quality', 'good_quality', 'marginal_quality')),
            workflow_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND has_workflow = true)
          WHERE id = OLD.project_id;
        END IF;
        
        RETURN NEW;
      END;
      $$;


--
-- Name: update_project_stats_on_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_project_stats_on_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        IF OLD.project_id IS NOT NULL THEN
          UPDATE bulk_analysis_projects SET
            domain_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id),
            qualified_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND qualification_status IN ('high_quality', 'good_quality', 'marginal_quality')),
            workflow_count = (SELECT COUNT(*) FROM bulk_analysis_domains WHERE project_id = OLD.project_id AND has_workflow = true)
          WHERE id = OLD.project_id;
        END IF;
        
        RETURN OLD;
      END;
      $$;


--
-- Name: update_publisher_offerings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_publisher_offerings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
          BEGIN
              NEW.updated_at = CURRENT_TIMESTAMP;
              RETURN NEW;
          END;
          $$;


--
-- Name: account_order_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_order_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid NOT NULL,
    access_level character varying(50) DEFAULT 'view'::character varying NOT NULL,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    granted_by uuid NOT NULL
);


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255),
    contact_name character varying(255) NOT NULL,
    company_name character varying(255) NOT NULL,
    phone character varying(50),
    website character varying(255),
    tax_id character varying(100),
    billing_address text,
    billing_city character varying(100),
    billing_state character varying(100),
    billing_zip character varying(20),
    billing_country character varying(100),
    credit_terms character varying(50) DEFAULT 'prepay'::character varying,
    credit_limit bigint DEFAULT 0,
    primary_client_id uuid,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    reset_token character varying(255),
    reset_token_expiry timestamp without time zone,
    internal_notes text,
    order_preferences text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    last_login_at timestamp without time zone,
    onboarding_completed boolean DEFAULT false,
    onboarding_steps jsonb DEFAULT '{}'::jsonb,
    onboarding_completed_at timestamp without time zone,
    role character varying(50) DEFAULT 'viewer'::character varying NOT NULL,
    ai_permissions text DEFAULT '{}'::text,
    can_use_ai_keywords boolean DEFAULT false,
    can_use_ai_descriptions boolean DEFAULT false,
    can_use_ai_content_generation boolean DEFAULT false,
    google_id character varying(255),
    oauth_providers text DEFAULT '[]'::text,
    auth_method character varying(20) DEFAULT 'password'::character varying
);


--
-- Name: agent_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_sessions (
    id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    step_id character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    agent_id character varying(255),
    conversation_id character varying(255),
    total_sections integer DEFAULT 0,
    completed_sections integer DEFAULT 0,
    target_word_count integer,
    current_word_count integer DEFAULT 0,
    outline text,
    session_metadata jsonb,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    agent_profile character varying(50) DEFAULT 'narrative-focused'::character varying
);


--
-- Name: airtable_sync_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.airtable_sync_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: airtable_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.airtable_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id character varying(255) NOT NULL,
    event_type character varying(100) NOT NULL,
    table_id character varying(255) NOT NULL,
    record_id character varying(255) NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    processed_at timestamp without time zone,
    error text,
    received_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: article_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.article_sections (
    id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    section_number integer NOT NULL,
    title character varying(255) NOT NULL,
    content text,
    word_count integer DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    agent_conversation_id character varying(255),
    generation_metadata jsonb,
    error_message text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: audit_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_sections (
    id uuid NOT NULL,
    audit_session_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    section_number integer NOT NULL,
    title character varying(255) NOT NULL,
    original_content text,
    audited_content text,
    strengths text,
    weaknesses text,
    editing_pattern character varying(100),
    citations_added integer DEFAULT 0,
    proceed_content text,
    cleanup_content text,
    proceed_status character varying(50) DEFAULT 'pending'::character varying,
    cleanup_status character varying(50) DEFAULT 'pending'::character varying,
    brand_compliance_score integer,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    audit_metadata jsonb,
    error_message text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: audit_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_sessions (
    id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    step_id character varying(100) NOT NULL,
    audit_type character varying(50) DEFAULT NULL::character varying,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_sections integer DEFAULT 0,
    completed_sections integer DEFAULT 0,
    total_citations_used integer DEFAULT 0,
    total_proceed_steps integer DEFAULT 0,
    completed_proceed_steps integer DEFAULT 0,
    total_cleanup_steps integer DEFAULT 0,
    completed_cleanup_steps integer DEFAULT 0,
    original_article text,
    research_outline text,
    audit_metadata jsonb,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: benchmark_comparisons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benchmark_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    benchmark_id uuid NOT NULL,
    order_id uuid NOT NULL,
    compared_at timestamp without time zone DEFAULT now() NOT NULL,
    compared_by uuid,
    comparison_data jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bulk_analysis_domains; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_analysis_domains (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    domain character varying(255) NOT NULL,
    qualification_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    target_page_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    keyword_count integer DEFAULT 0,
    checked_by uuid,
    checked_at timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dataforseo_status character varying(50) DEFAULT 'pending'::character varying,
    dataforseo_keywords_found integer DEFAULT 0,
    dataforseo_analyzed_at timestamp without time zone,
    has_workflow boolean DEFAULT false,
    workflow_id uuid,
    workflow_created_at timestamp without time zone,
    dataforseo_searched_keywords text[] DEFAULT '{}'::text[],
    dataforseo_last_full_analysis_at timestamp without time zone,
    dataforseo_total_api_calls integer DEFAULT 0,
    dataforseo_incremental_api_calls integer DEFAULT 0,
    has_dataforseo_results boolean DEFAULT false,
    dataforseo_last_analyzed timestamp without time zone,
    ai_qualification_reasoning text,
    ai_qualified_at timestamp without time zone,
    was_manually_qualified boolean DEFAULT false,
    manually_qualified_by uuid,
    manually_qualified_at timestamp without time zone,
    was_human_verified boolean DEFAULT false,
    human_verified_by uuid,
    human_verified_at timestamp without time zone,
    dataforseo_results_count integer DEFAULT 0,
    project_id uuid,
    project_added_at timestamp without time zone,
    selected_target_page_id uuid,
    overlap_status character varying(10),
    authority_direct character varying(10),
    authority_related character varying(10),
    topic_scope character varying(20),
    topic_reasoning text,
    evidence json,
    airtable_record_id character varying(255),
    airtable_metadata jsonb,
    airtable_last_synced timestamp without time zone,
    duplicate_of uuid,
    duplicate_resolution character varying(50),
    duplicate_resolved_by uuid,
    duplicate_resolved_at timestamp without time zone,
    original_project_id uuid,
    resolution_metadata jsonb,
    normalized_domain character varying(255),
    CONSTRAINT bulk_analysis_domains_duplicate_resolution_check CHECK (((duplicate_resolution)::text = ANY ((ARRAY['keep_both'::character varying, 'move_to_new'::character varying, 'skip'::character varying, 'update_original'::character varying])::text[])))
);


--
-- Name: COLUMN bulk_analysis_domains.duplicate_of; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bulk_analysis_domains.duplicate_of IS 'References the original domain entry if this is a duplicate';


--
-- Name: COLUMN bulk_analysis_domains.duplicate_resolution; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bulk_analysis_domains.duplicate_resolution IS 'Resolution action taken: keep_both (domain exists in multiple projects), move_to_new (removed from original project), skip (not added to new project), update_original (original entry updated)';


--
-- Name: COLUMN bulk_analysis_domains.original_project_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bulk_analysis_domains.original_project_id IS 'Tracks the original project when domain was moved';


--
-- Name: COLUMN bulk_analysis_domains.resolution_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bulk_analysis_domains.resolution_metadata IS 'JSON metadata about the resolution process including conflict details';


--
-- Name: bulk_analysis_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_analysis_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#6366f1'::character varying,
    icon character varying(50) DEFAULT '📁'::character varying,
    status character varying(50) DEFAULT 'active'::character varying,
    auto_apply_keywords jsonb,
    tags jsonb DEFAULT '[]'::jsonb,
    domain_count integer DEFAULT 0,
    qualified_count integer DEFAULT 0,
    workflow_count integer DEFAULT 0,
    last_activity_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bulk_dataforseo_job_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_dataforseo_job_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    domain_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying,
    keywords_analyzed integer,
    rankings_found integer,
    error_message text,
    processed_at timestamp without time zone
);


--
-- Name: bulk_dataforseo_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_dataforseo_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying,
    total_domains integer,
    processed_domains integer DEFAULT 0,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: client_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    website character varying(255),
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    description text DEFAULT ''::text,
    client_type character varying(50) DEFAULT 'client'::character varying,
    converted_from_prospect_at timestamp without time zone,
    conversion_notes text,
    default_requirements jsonb DEFAULT '{}'::jsonb,
    account_id uuid,
    share_token character varying(255),
    invitation_id uuid,
    archived_at timestamp without time zone,
    archived_by uuid,
    archive_reason text
);


--
-- Name: commission_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    scope_type character varying(50) NOT NULL,
    scope_id uuid,
    commission_type character varying(50) NOT NULL,
    base_commission_percent numeric(5,2),
    tier_rules jsonb DEFAULT '[]'::jsonb,
    rush_order_commission_percent numeric(5,2),
    bulk_order_commission_percent numeric(5,2),
    valid_from date DEFAULT CURRENT_DATE NOT NULL,
    valid_until date,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cron_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cron_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    schedule character varying(100) NOT NULL,
    enabled boolean DEFAULT true,
    last_run_at timestamp without time zone,
    next_run_at timestamp without time zone,
    last_run_status character varying(50),
    last_run_error text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dataforseo_api_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dataforseo_api_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id character varying(255),
    endpoint text NOT NULL,
    request_payload jsonb NOT NULL,
    request_headers jsonb,
    domain_id uuid,
    client_id uuid,
    domain character varying(255),
    response_status integer,
    response_data jsonb,
    error_message text,
    cost numeric(10,6),
    keyword_count integer,
    location_code integer,
    language_code character varying(10),
    requested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    responded_at timestamp without time zone,
    request_type character varying(50),
    user_id uuid
);


--
-- Name: domain_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    account_email character varying(255),
    domain_id uuid NOT NULL,
    order_id uuid,
    match_score integer,
    match_reasons text[],
    retail_price integer NOT NULL,
    suggested_by uuid NOT NULL,
    suggested_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    viewed_at timestamp without time zone,
    response_at timestamp without time zone,
    account_notes text,
    CONSTRAINT domain_suggestions_match_score_check CHECK (((match_score >= 0) AND (match_score <= 100)))
);


--
-- Name: duplicate_websites; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.duplicate_websites AS
 SELECT normalized_domain,
    count(*) AS duplicate_count,
    array_agg(id ORDER BY created_at) AS website_ids,
    array_agg(domain ORDER BY created_at) AS original_domains,
    min(created_at) AS first_created,
    max(created_at) AS last_created
   FROM public.websites
  WHERE (normalized_domain IS NOT NULL)
  GROUP BY normalized_domain
 HAVING (count(*) > 1)
  ORDER BY (count(*)) DESC;


--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type character varying(50) NOT NULL,
    recipients text[] NOT NULL,
    subject character varying(255) NOT NULL,
    status character varying(20) NOT NULL,
    sent_at timestamp without time zone,
    error text,
    resend_id character varying(255),
    metadata jsonb,
    sent_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE email_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_logs IS 'Tracks all email sending activity through Resend';


--
-- Name: email_processing_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_processing_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id character varying(255),
    campaign_id character varying(255),
    campaign_name character varying(255),
    campaign_type character varying(50),
    email_from character varying(255) NOT NULL,
    email_to character varying(255),
    email_subject character varying(500),
    email_message_id character varying(255),
    received_at timestamp without time zone,
    raw_content text NOT NULL,
    html_content text,
    parsed_data jsonb DEFAULT '{}'::jsonb,
    confidence_score numeric(3,2),
    parsing_errors text[],
    status character varying(50) DEFAULT 'pending'::character varying,
    error_message text,
    processed_at timestamp without time zone,
    processing_duration_ms integer,
    thread_id character varying(255),
    reply_count integer DEFAULT 0,
    is_auto_reply boolean DEFAULT false,
    original_outreach_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    sender_email character varying(255)
);


--
-- Name: email_review_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_review_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    log_id uuid,
    publisher_id uuid,
    priority integer DEFAULT 50,
    status character varying(50) DEFAULT 'pending'::character varying,
    queue_reason character varying(100),
    suggested_actions jsonb DEFAULT '{}'::jsonb,
    missing_fields text[],
    review_notes text,
    corrections_made jsonb DEFAULT '{}'::jsonb,
    assigned_to uuid,
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    auto_approve_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: formatting_qa_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formatting_qa_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    qa_session_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    check_number integer NOT NULL,
    check_type character varying(255) NOT NULL,
    check_description text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    issues_found text,
    location_details text,
    confidence_score integer,
    fix_suggestions text,
    check_metadata jsonb,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: formatting_qa_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.formatting_qa_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    step_id character varying(100) DEFAULT 'formatting-qa'::character varying NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_checks integer DEFAULT 0,
    passed_checks integer DEFAULT 0,
    failed_checks integer DEFAULT 0,
    original_article text,
    qa_metadata jsonb,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    cleaned_article text,
    fixes_applied jsonb
);


--
-- Name: guest_post_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guest_post_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    domain_id uuid NOT NULL,
    domain character varying(255) NOT NULL,
    domain_rating integer,
    traffic integer,
    retail_price integer NOT NULL,
    wholesale_price integer NOT NULL,
    workflow_id uuid,
    workflow_status character varying(50),
    workflow_created_at timestamp without time zone,
    workflow_completed_at timestamp without time zone,
    published_url character varying(500),
    published_at timestamp without time zone,
    publication_verified boolean DEFAULT false,
    has_issues boolean DEFAULT false,
    issue_notes text,
    issue_resolved_at timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    target_page_id uuid,
    order_group_id uuid,
    site_selection_id uuid
);


--
-- Name: TABLE guest_post_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.guest_post_items IS 'Guest post specific order items. Previously named order_items.';


--
-- Name: COLUMN guest_post_items.target_page_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.guest_post_items.target_page_id IS 'References the target page selected for this domain from the client target pages';


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    revoked_at timestamp without time zone,
    created_by_email character varying(255) DEFAULT 'admin@system.com'::character varying NOT NULL,
    target_table character varying(20) DEFAULT 'accounts'::character varying NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    payment_id uuid,
    invoice_number character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    subtotal integer NOT NULL,
    tax integer DEFAULT 0,
    discount integer DEFAULT 0,
    total integer NOT NULL,
    issue_date timestamp without time zone DEFAULT now() NOT NULL,
    due_date timestamp without time zone NOT NULL,
    paid_date timestamp without time zone,
    file_url character varying(500),
    sent_at timestamp without time zone,
    sent_to character varying(255),
    line_items jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: keyword_analysis_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_analysis_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bulk_analysis_domain_id uuid NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    keywords_analyzed integer DEFAULT 0,
    location_code integer DEFAULT 2840 NOT NULL,
    language_code character varying(10) DEFAULT 'en'::character varying NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: keyword_analysis_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_analysis_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bulk_analysis_domain_id uuid NOT NULL,
    keyword text NOT NULL,
    "position" integer NOT NULL,
    search_volume integer,
    url text NOT NULL,
    keyword_difficulty integer,
    cpc numeric(10,2),
    competition character varying(20),
    location_code integer DEFAULT 2840 NOT NULL,
    language_code character varying(10) DEFAULT 'en'::character varying NOT NULL,
    analysis_date timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    analysis_batch_id uuid,
    is_incremental boolean DEFAULT false
);


--
-- Name: keyword_search_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.keyword_search_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bulk_analysis_domain_id uuid NOT NULL,
    keyword text NOT NULL,
    location_code integer DEFAULT 2840 NOT NULL,
    language_code character varying(10) DEFAULT 'en'::character varying NOT NULL,
    has_results boolean DEFAULT false NOT NULL,
    searched_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: line_item_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.line_item_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    line_item_id uuid NOT NULL,
    field_name character varying(100) NOT NULL,
    old_value text,
    new_value text,
    changed_by uuid,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    change_reason text
);


--
-- Name: line_item_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.line_item_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    default_anchor_text text,
    default_instructions text,
    pricing_rules jsonb,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: link_orchestration_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.link_orchestration_sessions (
    id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status character varying(50) NOT NULL,
    current_phase integer DEFAULT 1,
    phase1_start timestamp without time zone,
    phase1_complete timestamp without time zone,
    phase2_start timestamp without time zone,
    phase2_complete timestamp without time zone,
    phase3_start timestamp without time zone,
    phase3_complete timestamp without time zone,
    original_article text NOT NULL,
    article_after_phase1 text,
    article_after_phase2 text,
    final_article text,
    target_domain text NOT NULL,
    client_name character varying(255) NOT NULL,
    client_url text NOT NULL,
    anchor_text character varying(255),
    guest_post_site text NOT NULL,
    target_keyword character varying(255) NOT NULL,
    phase1_results jsonb,
    phase2_results jsonb,
    phase3_results jsonb,
    error_message text,
    error_details jsonb,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    failed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    internal_links_result jsonb,
    client_mention_result jsonb,
    client_link_result jsonb,
    client_link_conversation jsonb,
    image_strategy jsonb,
    link_requests text,
    url_suggestion text
);


--
-- Name: linkio_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linkio_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    asset_type character varying(50) NOT NULL,
    original_url text NOT NULL,
    description text,
    alt_text text,
    needs_recreation boolean DEFAULT true,
    our_url text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: linkio_blog_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linkio_blog_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name character varying(100) NOT NULL,
    category_slug character varying(100) NOT NULL,
    post_count integer DEFAULT 0,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: linkio_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linkio_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_id uuid NOT NULL,
    component_type character varying(50) NOT NULL,
    component_name character varying(255),
    original_content jsonb,
    our_content jsonb,
    is_recreated boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: linkio_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linkio_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_url text NOT NULL,
    original_title text,
    original_meta_description text,
    page_type public.page_type DEFAULT 'other'::public.page_type NOT NULL,
    category character varying(100),
    priority integer DEFAULT 0,
    recreation_status public.recreation_status DEFAULT 'identified'::public.recreation_status NOT NULL,
    our_slug character varying(255),
    our_title text,
    our_meta_description text,
    content_structure jsonb,
    key_features jsonb,
    word_count integer,
    has_video boolean DEFAULT false,
    has_tools boolean DEFAULT false,
    has_cta boolean DEFAULT true,
    notes text,
    skip_reason text,
    identified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    analyzed_at timestamp without time zone,
    completed_at timestamp without time zone,
    published_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: master_qualification_job_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_qualification_job_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid,
    domain_id uuid,
    domain character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    stage character varying(50),
    dataforseo_status character varying(50),
    ai_status character varying(50),
    qualification_status character varying(50),
    keywords_found integer,
    error_message text,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: master_qualification_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_qualification_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying,
    total_domains integer NOT NULL,
    processed_domains integer DEFAULT 0,
    dataforseo_completed integer DEFAULT 0,
    ai_completed integer DEFAULT 0,
    failed_domains integer DEFAULT 0,
    current_stage character varying(50),
    current_domain character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    started_at timestamp without time zone,
    completed_at timestamp without time zone
);


--
-- Name: migration_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_history (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT now() NOT NULL,
    execution_time_ms integer,
    success boolean DEFAULT true NOT NULL,
    error_message text,
    applied_by character varying(255)
);


--
-- Name: migration_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migration_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migration_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migration_history_id_seq OWNED BY public.migration_history.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    error text
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: order_benchmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_benchmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    benchmark_type character varying(50) NOT NULL,
    benchmark_data jsonb NOT NULL,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    notes text,
    captured_by uuid NOT NULL,
    capture_reason character varying(50) NOT NULL,
    captured_at timestamp without time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_latest boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: order_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    client_id uuid NOT NULL,
    link_count integer NOT NULL,
    target_pages jsonb DEFAULT '[]'::jsonb,
    anchor_texts jsonb DEFAULT '[]'::jsonb,
    requirement_overrides jsonb DEFAULT '{}'::jsonb,
    bulk_analysis_project_id uuid,
    analysis_started_at timestamp without time zone,
    analysis_completed_at timestamp without time zone,
    group_status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: order_line_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    client_id uuid NOT NULL,
    target_page_id uuid,
    target_page_url text,
    anchor_text text,
    assigned_domain_id uuid,
    assigned_domain character varying(255),
    estimated_price integer,
    wholesale_price integer,
    approved_price integer,
    status character varying(50) DEFAULT 'draft'::character varying,
    workflow_id uuid,
    draft_url text,
    published_url text,
    delivered_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    added_by_user_id uuid,
    approved_by_user_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    publisher_id uuid,
    publisher_offering_id uuid,
    publisher_status character varying(50) DEFAULT NULL::character varying,
    publisher_price integer,
    platform_fee integer,
    publisher_notified_at timestamp without time zone,
    publisher_accepted_at timestamp without time zone,
    publisher_submitted_at timestamp without time zone,
    publisher_paid_at timestamp without time zone,
    assigned_at timestamp without time zone,
    assigned_by uuid,
    service_fee integer DEFAULT 7900,
    final_price integer,
    client_review_status character varying(20),
    client_reviewed_at timestamp without time zone,
    client_review_notes text,
    delivery_notes text,
    added_at timestamp without time zone DEFAULT now() NOT NULL,
    added_by uuid NOT NULL,
    modified_at timestamp without time zone,
    modified_by uuid,
    cancelled_at timestamp without time zone,
    cancelled_by uuid,
    cancellation_reason text,
    display_order integer DEFAULT 0 NOT NULL,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: TABLE order_line_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.order_line_items IS 'Primary order tracking system - each link is a separate trackable unit';


--
-- Name: COLUMN order_line_items.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_line_items.metadata IS 'Flexible JSON storage including migration tracking';


--
-- Name: COLUMN order_line_items.publisher_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_line_items.publisher_id IS 'The publisher assigned to handle this order line item';


--
-- Name: COLUMN order_line_items.publisher_offering_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_line_items.publisher_offering_id IS 'The specific publisher offering used for this order';


--
-- Name: COLUMN order_line_items.publisher_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_line_items.publisher_status IS 'Publisher-specific status: pending, notified, accepted, rejected, in_progress, submitted, completed';


--
-- Name: COLUMN order_line_items.publisher_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_line_items.publisher_price IS 'The price agreed with the publisher (in cents)';


--
-- Name: COLUMN order_line_items.platform_fee; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_line_items.platform_fee IS 'Platform commission fee (in cents)';


--
-- Name: order_share_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_share_tokens (
    token character varying(255) NOT NULL,
    order_id uuid NOT NULL,
    permissions text[] DEFAULT ARRAY['view'::text],
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    used_at timestamp without time zone,
    used_by_ip character varying(45),
    use_count integer DEFAULT 0
);


--
-- Name: order_site_selections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_site_selections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_group_id uuid NOT NULL,
    domain_id uuid NOT NULL,
    status character varying(50) DEFAULT 'suggested'::character varying NOT NULL,
    target_page_url text,
    anchor_text character varying(255),
    reviewed_at timestamp without time zone,
    reviewed_by uuid,
    client_notes text,
    internal_notes text,
    order_item_id uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: order_site_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_site_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_group_id uuid NOT NULL,
    domain_id uuid NOT NULL,
    submission_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    submitted_at timestamp without time zone,
    submitted_by uuid,
    client_reviewed_at timestamp without time zone,
    client_review_notes text,
    published_url text,
    published_at timestamp without time zone,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    client_reviewed_by uuid,
    completed_at timestamp without time zone,
    selection_pool character varying(20) DEFAULT 'primary'::character varying,
    pool_rank integer DEFAULT 1,
    wholesale_price_snapshot integer,
    retail_price_snapshot integer,
    service_fee_snapshot integer DEFAULT 7900,
    price_snapshot_at timestamp without time zone,
    inclusion_status character varying(50),
    inclusion_order integer,
    exclusion_reason text
);


--
-- Name: COLUMN order_site_submissions.wholesale_price_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_site_submissions.wholesale_price_snapshot IS 'Wholesale price in cents at time of approval';


--
-- Name: COLUMN order_site_submissions.retail_price_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_site_submissions.retail_price_snapshot IS 'Retail price in cents at time of approval';


--
-- Name: COLUMN order_site_submissions.service_fee_snapshot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.order_site_submissions.service_fee_snapshot IS 'Service fee in cents at time of approval';


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    old_status character varying(50),
    new_status character varying(50) NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text
);


--
-- Name: order_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.order_summary AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS account_id,
    NULL::character varying(50) AS state,
    NULL::character varying(50) AS status,
    NULL::integer AS total_retail,
    NULL::bigint AS client_count,
    NULL::bigint AS total_links,
    NULL::bigint AS approved_sites,
    NULL::timestamp without time zone AS created_at,
    NULL::timestamp without time zone AS updated_at;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    subtotal_retail integer DEFAULT 0 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount integer DEFAULT 0 NOT NULL,
    total_retail integer DEFAULT 0 NOT NULL,
    total_wholesale integer DEFAULT 0 NOT NULL,
    profit_margin integer DEFAULT 0 NOT NULL,
    includes_client_review boolean DEFAULT false,
    client_review_fee integer DEFAULT 0,
    rush_delivery boolean DEFAULT false,
    rush_fee integer DEFAULT 0,
    share_token character varying(255),
    share_expires_at timestamp without time zone,
    approved_at timestamp without time zone,
    invoiced_at timestamp without time zone,
    paid_at timestamp without time zone,
    completed_at timestamp without time zone,
    cancelled_at timestamp without time zone,
    created_by uuid NOT NULL,
    assigned_to uuid,
    internal_notes text,
    account_notes text,
    cancellation_reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    state character varying(50) DEFAULT 'configuring'::character varying,
    requires_client_review boolean DEFAULT false,
    review_completed_at timestamp without time zone,
    order_type character varying(50) DEFAULT 'guest_post'::character varying NOT NULL,
    invoice_data jsonb,
    estimated_budget_min integer,
    estimated_budget_max integer,
    estimated_links_count integer,
    preferences_dr_min integer,
    preferences_dr_max integer,
    preferences_traffic_min integer,
    preferences_categories text[],
    preferences_types text[],
    preferences_niches text[],
    estimator_snapshot jsonb,
    estimated_price_per_link integer,
    actual_price_per_link integer,
    preference_match_score numeric(5,2),
    is_template boolean DEFAULT false,
    template_name character varying(255),
    copied_from_order_id uuid,
    refunded_at timestamp without time zone,
    partial_refund_amount integer,
    proposal_video_url text,
    proposal_message text
);


--
-- Name: COLUMN orders.order_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.order_type IS 'Type of order: guest_post, link_insertion, etc.';


--
-- Name: COLUMN orders.estimated_budget_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.estimated_budget_min IS 'Minimum budget estimate in cents';


--
-- Name: COLUMN orders.estimated_budget_max; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.estimated_budget_max IS 'Maximum budget estimate in cents';


--
-- Name: COLUMN orders.preferences_dr_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.preferences_dr_min IS 'Minimum Domain Rating preference';


--
-- Name: COLUMN orders.preferences_dr_max; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.preferences_dr_max IS 'Maximum Domain Rating preference';


--
-- Name: COLUMN orders.preferences_traffic_min; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.preferences_traffic_min IS 'Minimum monthly traffic preference';


--
-- Name: COLUMN orders.preferences_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.preferences_categories IS 'Preferred website categories';


--
-- Name: COLUMN orders.preferences_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.preferences_types IS 'Preferred website types';


--
-- Name: COLUMN orders.estimated_price_per_link; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.orders.estimated_price_per_link IS 'Estimated price per link in cents';


--
-- Name: outline_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outline_sessions (
    id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    step_id character varying(100) DEFAULT 'deep-research'::character varying NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    outline_prompt text,
    clarification_questions jsonb,
    clarification_answers text,
    agent_state jsonb,
    research_instructions text,
    final_outline text,
    citations jsonb,
    session_metadata jsonb,
    error_message text,
    started_at timestamp with time zone NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    background_response_id character varying(255),
    polling_attempts integer DEFAULT 0,
    last_polled_at timestamp without time zone,
    is_active boolean DEFAULT false,
    last_sequence_number integer DEFAULT 0,
    connection_status character varying(50),
    stream_started_at timestamp without time zone,
    partial_content text
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    used_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    account_id uuid NOT NULL,
    amount integer NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    method public.payment_method NOT NULL,
    transaction_id character varying(255),
    processor_response jsonb,
    notes character varying(1000),
    failure_reason character varying(500),
    recorded_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    processed_at timestamp without time zone,
    is_partial boolean DEFAULT false,
    remaining_amount integer,
    stripe_payment_intent_id character varying(255)
);


--
-- Name: polish_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polish_sections (
    id uuid NOT NULL,
    polish_session_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    section_number integer NOT NULL,
    title character varying(500) NOT NULL,
    original_content text,
    polished_content text,
    strengths text,
    weaknesses text,
    brand_conflicts text,
    polish_approach text,
    engagement_score real,
    clarity_score real,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    polish_metadata jsonb,
    error_message text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: polish_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.polish_sessions (
    id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    step_id character varying(100) DEFAULT 'final-polish'::character varying NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    total_sections integer DEFAULT 0,
    completed_sections integer DEFAULT 0,
    original_article text,
    research_context text,
    brand_conflicts_found integer DEFAULT 0,
    polish_metadata jsonb,
    error_message text,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid,
    name character varying(255) NOT NULL,
    min_quantity integer NOT NULL,
    max_quantity integer,
    discount_percent numeric(5,2) NOT NULL,
    valid_from timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    valid_until timestamp without time zone,
    created_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: project_order_associations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_order_associations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    order_group_id uuid NOT NULL,
    project_id uuid NOT NULL,
    association_type character varying(50) DEFAULT 'primary'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    notes jsonb
);


--
-- Name: project_websites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_websites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    website_id uuid NOT NULL,
    added_by uuid NOT NULL,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    analysis_status character varying(50) DEFAULT 'pending'::character varying,
    dataforseo_data jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: publisher_automation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_automation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_log_id uuid,
    publisher_id uuid,
    action character varying(100) NOT NULL,
    action_status character varying(50) DEFAULT 'success'::character varying,
    previous_data jsonb,
    new_data jsonb,
    fields_updated text[],
    confidence numeric(3,2),
    match_method character varying(50),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: publisher_earnings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    order_line_item_id uuid,
    order_id uuid,
    earning_type character varying(50) NOT NULL,
    amount bigint NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    gross_amount bigint,
    platform_fee_percent numeric(5,2),
    platform_fee_amount bigint,
    net_amount bigint NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    confirmed_at timestamp without time zone,
    payment_batch_id uuid,
    payment_method character varying(50),
    payment_reference character varying(255),
    paid_at timestamp without time zone,
    website_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: publisher_email_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_email_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    website_id uuid NOT NULL,
    email_domain character varying(255) NOT NULL,
    verification_token character varying(255) NOT NULL,
    verification_sent_at timestamp without time zone,
    verified_at timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    rejection_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    claim_confidence character varying(50),
    claim_source character varying(100)
);


--
-- Name: publisher_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    invoice_number character varying(100) NOT NULL,
    invoice_date date NOT NULL,
    due_date date,
    gross_amount integer NOT NULL,
    tax_amount integer DEFAULT 0,
    total_amount integer NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    description text NOT NULL,
    line_items jsonb,
    notes text,
    invoice_file_url character varying(500),
    supporting_documents jsonb,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp without time zone,
    review_notes text,
    approved_by uuid,
    approved_at timestamp without time zone,
    approved_amount integer,
    paid_by uuid,
    paid_at timestamp without time zone,
    payment_method character varying(50),
    payment_reference character varying(255),
    payment_notes text,
    related_order_line_items jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT publisher_invoices_gross_amount_check CHECK ((gross_amount > 0)),
    CONSTRAINT publisher_invoices_total_amount_check CHECK ((total_amount > 0))
);


--
-- Name: publisher_offering_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_offering_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    offering_id uuid,
    website_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true,
    custom_terms jsonb DEFAULT '{}'::jsonb,
    verified_at timestamp without time zone,
    verified_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    relationship_type character varying(50) DEFAULT 'contact'::character varying NOT NULL,
    verification_status character varying(20) DEFAULT 'claimed'::character varying NOT NULL,
    priority_rank integer DEFAULT 100,
    is_preferred boolean DEFAULT false,
    verification_method character varying(50),
    contact_email character varying(255),
    contact_phone character varying(50),
    contact_name character varying(255),
    internal_notes text,
    publisher_notes text,
    commission_rate character varying(50),
    payment_terms character varying(255)
);


--
-- Name: TABLE publisher_offering_relationships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.publisher_offering_relationships IS 'Links publishers to websites with specific offerings';


--
-- Name: COLUMN publisher_offering_relationships.offering_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offering_relationships.offering_id IS 'Reference to publisher_offerings.id - nullable to allow relationships before offerings are created';


--
-- Name: COLUMN publisher_offering_relationships.relationship_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offering_relationships.relationship_type IS 'Type of relationship: contact, owner, manager, editor, broker';


--
-- Name: COLUMN publisher_offering_relationships.verification_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offering_relationships.verification_status IS 'Status: claimed, pending, verified, rejected';


--
-- Name: COLUMN publisher_offering_relationships.priority_rank; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offering_relationships.priority_rank IS 'Order priority for multiple publishers on same website (lower = higher priority)';


--
-- Name: COLUMN publisher_offering_relationships.is_preferred; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offering_relationships.is_preferred IS 'Whether this is the preferred publisher for the website';


--
-- Name: publisher_offerings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    offering_type character varying(50) NOT NULL,
    base_price integer NOT NULL,
    turnaround_days integer,
    min_word_count integer,
    max_word_count integer,
    niches text[],
    languages character varying(10)[] DEFAULT ARRAY['en'::text],
    attributes jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    currency character varying(10) DEFAULT 'USD'::character varying NOT NULL,
    current_availability character varying(50) DEFAULT 'available'::character varying NOT NULL,
    express_available boolean DEFAULT false,
    express_price integer,
    express_days integer,
    offering_name character varying(255)
);


--
-- Name: TABLE publisher_offerings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.publisher_offerings IS 'Defines specific service offerings by publishers';


--
-- Name: COLUMN publisher_offerings.currency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offerings.currency IS 'Currency code for pricing (USD, EUR, etc.)';


--
-- Name: COLUMN publisher_offerings.current_availability; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offerings.current_availability IS 'Current availability status (available, limited, unavailable)';


--
-- Name: COLUMN publisher_offerings.express_available; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offerings.express_available IS 'Whether express service is available';


--
-- Name: COLUMN publisher_offerings.express_price; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offerings.express_price IS 'Express service price in cents';


--
-- Name: COLUMN publisher_offerings.express_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offerings.express_days IS 'Days for express delivery';


--
-- Name: COLUMN publisher_offerings.offering_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_offerings.offering_name IS 'Custom name for the offering';


--
-- Name: publisher_order_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_order_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    website_id uuid,
    period_type character varying(20) NOT NULL,
    period_date date NOT NULL,
    total_orders integer DEFAULT 0,
    pending_orders integer DEFAULT 0,
    completed_orders integer DEFAULT 0,
    cancelled_orders integer DEFAULT 0,
    gross_earnings bigint DEFAULT 0,
    platform_fees bigint DEFAULT 0,
    net_earnings bigint DEFAULT 0,
    paid_amount bigint DEFAULT 0,
    pending_payment bigint DEFAULT 0,
    avg_completion_days numeric(10,2),
    acceptance_rate numeric(5,2),
    on_time_rate numeric(5,2),
    quality_score numeric(5,2),
    orders_change_percent numeric(10,2),
    earnings_change_percent numeric(10,2),
    calculated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: publisher_order_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_order_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    order_line_item_id uuid,
    notification_type character varying(50) NOT NULL,
    channel character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    sent_at timestamp without time zone,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    subject character varying(500),
    message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    error_message text,
    retry_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: publisher_payment_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_payment_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_number character varying(50) NOT NULL,
    publisher_id uuid,
    payment_method character varying(50) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    total_earnings bigint NOT NULL,
    total_deductions bigint DEFAULT 0,
    net_amount bigint NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying,
    approved_by uuid,
    approved_at timestamp without time zone,
    payment_reference character varying(255),
    payment_notes text,
    paid_at timestamp without time zone,
    error_message text,
    retry_count integer DEFAULT 0,
    earnings_count integer DEFAULT 0,
    period_start date,
    period_end date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: publisher_payment_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_payment_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    preferred_method character varying(50) DEFAULT 'bank_transfer'::character varying NOT NULL,
    bank_name character varying(255),
    bank_account_holder character varying(255),
    bank_account_number character varying(100),
    bank_routing_number character varying(50),
    bank_swift_code character varying(20),
    bank_address text,
    paypal_email character varying(255),
    mailing_address text,
    mailing_city character varying(100),
    mailing_state character varying(50),
    mailing_zip character varying(20),
    mailing_country character varying(50) DEFAULT 'US'::character varying,
    tax_id character varying(50),
    tax_form_type character varying(10),
    is_business boolean DEFAULT false,
    business_name character varying(255),
    minimum_payout_amount integer DEFAULT 5000,
    payment_frequency character varying(20) DEFAULT 'monthly'::character varying,
    preferred_payment_day integer DEFAULT 1,
    is_verified boolean DEFAULT false,
    verification_notes text,
    verified_at timestamp without time zone,
    verified_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: publisher_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    payout_period_start date NOT NULL,
    payout_period_end date NOT NULL,
    total_amount integer NOT NULL,
    commission_rate numeric(5,2) NOT NULL,
    commission_amount integer NOT NULL,
    net_amount integer NOT NULL,
    payment_method character varying(50),
    payment_reference character varying(255),
    payment_date timestamp without time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE publisher_payouts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.publisher_payouts IS 'Records publisher payment history';


--
-- Name: publisher_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_performance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    website_id uuid,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_orders integer DEFAULT 0,
    successful_orders integer DEFAULT 0,
    failed_orders integer DEFAULT 0,
    avg_response_time_hours numeric(10,2),
    avg_turnaround_days numeric(10,2),
    on_time_delivery_rate numeric(5,2),
    client_satisfaction_score numeric(3,2),
    revenue_generated integer DEFAULT 0,
    commission_earned integer DEFAULT 0,
    reliability_score numeric(3,2),
    metrics jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    content_approval_rate numeric(5,2) DEFAULT 0,
    revision_rate numeric(5,2) DEFAULT 0,
    total_revenue integer DEFAULT 0,
    avg_order_value integer DEFAULT 0,
    last_calculated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE publisher_performance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.publisher_performance IS 'Tracks publisher performance metrics over time';


--
-- Name: COLUMN publisher_performance.content_approval_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_performance.content_approval_rate IS 'Percentage of content approved without major revisions';


--
-- Name: COLUMN publisher_performance.revision_rate; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_performance.revision_rate IS 'Average number of revisions per order';


--
-- Name: COLUMN publisher_performance.total_revenue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_performance.total_revenue IS 'Total revenue in cents';


--
-- Name: COLUMN publisher_performance.avg_order_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_performance.avg_order_value IS 'Average order value in cents';


--
-- Name: COLUMN publisher_performance.last_calculated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publisher_performance.last_calculated_at IS 'When metrics were last calculated';


--
-- Name: publisher_pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_pricing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_offering_id uuid NOT NULL,
    rule_type character varying(50) NOT NULL,
    rule_name character varying(255) NOT NULL,
    description text,
    conditions jsonb NOT NULL,
    actions jsonb NOT NULL,
    priority integer DEFAULT 0,
    is_cumulative boolean DEFAULT false,
    auto_apply boolean DEFAULT true,
    requires_approval boolean DEFAULT false,
    valid_from timestamp without time zone,
    valid_until timestamp without time zone,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE publisher_pricing_rules; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.publisher_pricing_rules IS 'Dynamic pricing rules for publisher offerings';


--
-- Name: publisher_websites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publisher_websites (
    id uuid NOT NULL,
    publisher_id uuid NOT NULL,
    website_id uuid NOT NULL,
    can_edit_pricing boolean DEFAULT true,
    can_edit_availability boolean DEFAULT true,
    can_view_analytics boolean DEFAULT true,
    status character varying(20) DEFAULT 'active'::character varying,
    added_at timestamp without time zone DEFAULT now() NOT NULL,
    removed_at timestamp without time zone
);


--
-- Name: publishers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publishers (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255),
    contact_name character varying(255) DEFAULT 'Unknown'::character varying NOT NULL,
    company_name character varying(255),
    phone character varying(50),
    tax_id character varying(100),
    payment_email character varying(255),
    payment_method character varying(50) DEFAULT 'paypal'::character varying,
    bank_name character varying(255),
    bank_account_number character varying(255),
    bank_routing_number character varying(255),
    commission_rate integer DEFAULT 40,
    minimum_payout bigint DEFAULT 10000,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    reset_token character varying(255),
    reset_token_expiry timestamp without time zone,
    content_guidelines text,
    prohibited_topics text,
    turnaround_time integer DEFAULT 7,
    internal_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    last_login_at timestamp without time zone,
    google_id character varying(255),
    oauth_providers text DEFAULT '[]'::text,
    auth_method character varying(20) DEFAULT 'password'::character varying,
    account_status character varying(50) DEFAULT 'unclaimed'::character varying,
    source character varying(50) DEFAULT 'manual'::character varying,
    source_metadata jsonb DEFAULT '{}'::jsonb,
    claimed_at timestamp without time zone,
    invitation_token character varying(255),
    invitation_sent_at timestamp without time zone,
    invitation_expires_at timestamp without time zone,
    confidence_score numeric(3,2),
    claim_verification_code character varying(6),
    claim_attempts integer DEFAULT 0,
    last_claim_attempt timestamp without time zone,
    CONSTRAINT chk_account_status CHECK (((account_status)::text = ANY ((ARRAY['unclaimed'::character varying, 'shadow'::character varying, 'active'::character varying, 'system'::character varying, 'suspended'::character varying, 'blocked'::character varying])::text[]))),
    CONSTRAINT chk_claim_attempts CHECK ((claim_attempts >= 0)),
    CONSTRAINT chk_confidence_score CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric)))
);


--
-- Name: COLUMN publishers.account_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publishers.account_status IS 'Account status: unclaimed (shadow publisher), active (claimed), system (internal), suspended, blocked';


--
-- Name: COLUMN publishers.source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publishers.source IS 'Where this publisher was created from: manual, manyreach, import, api';


--
-- Name: COLUMN publishers.source_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publishers.source_metadata IS 'JSON metadata about the source (e.g., campaign_id, webhook_id)';


--
-- Name: COLUMN publishers.invitation_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publishers.invitation_token IS 'Secure token for claiming account via email invitation';


--
-- Name: COLUMN publishers.confidence_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publishers.confidence_score IS 'AI confidence score for extracted data (0-1)';


--
-- Name: COLUMN publishers.claim_verification_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.publishers.claim_verification_code IS '6-digit code sent via email for claim verification';


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    order_id uuid NOT NULL,
    stripe_refund_id character varying(255) NOT NULL,
    amount integer NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(50) NOT NULL,
    reason character varying(50),
    notes text,
    failure_reason character varying(500),
    initiated_by uuid NOT NULL,
    metadata jsonb,
    processed_at timestamp without time zone,
    canceled_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: shadow_publisher_websites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shadow_publisher_websites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    publisher_id uuid NOT NULL,
    website_id uuid NOT NULL,
    confidence numeric(3,2),
    source character varying(50),
    extraction_method character varying(100),
    verified boolean DEFAULT false,
    verified_by uuid,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: stripe_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    stripe_customer_id character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255),
    billing_address jsonb,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: stripe_payment_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_payment_intents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    payment_id uuid,
    stripe_payment_intent_id character varying(255) NOT NULL,
    stripe_customer_id character varying(255),
    amount integer NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(50) NOT NULL,
    client_secret text NOT NULL,
    metadata jsonb,
    idempotency_key character varying(255),
    payment_method_id character varying(255),
    setup_future_usage character varying(50),
    confirmation_method character varying(50) DEFAULT 'automatic'::character varying,
    amount_capturable integer,
    amount_captured integer DEFAULT 0,
    amount_received integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    confirmed_at timestamp without time zone,
    succeeded_at timestamp without time zone,
    canceled_at timestamp without time zone,
    last_webhook_event_id character varying(255),
    last_error jsonb,
    failure_code character varying(100),
    failure_message text
);


--
-- Name: stripe_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stripe_event_id character varying(255) NOT NULL,
    event_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    payment_intent_id uuid,
    order_id uuid,
    event_data jsonb NOT NULL,
    processed_at timestamp without time zone,
    error_message text,
    retry_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: target_pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_pages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    url text NOT NULL,
    domain character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    notes text,
    added_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    keywords text,
    description text,
    normalized_url character varying(500)
);


--
-- Name: user_client_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_client_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    access_level character varying(50) DEFAULT 'viewer'::character varying,
    granted_by uuid,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: user_website_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_website_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    website_id uuid NOT NULL,
    access_level character varying(50) DEFAULT 'publisher_member'::character varying,
    granted_by uuid,
    granted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    password_hash character varying(255),
    role character varying(50) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    user_type character varying(20) DEFAULT 'internal'::character varying,
    google_id character varying(255),
    oauth_providers text DEFAULT '[]'::text,
    auth_method character varying(20) DEFAULT 'password'::character varying
);


--
-- Name: v2_agent_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.v2_agent_sessions (
    id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    version integer NOT NULL,
    step_id character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    outline text,
    total_sections integer,
    completed_sections integer,
    current_word_count integer,
    total_word_count integer,
    final_article text,
    session_metadata jsonb,
    error_message text,
    started_at timestamp without time zone NOT NULL,
    completed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: v_active_publisher_offerings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_active_publisher_offerings AS
 SELECT po.id AS offering_id,
    po.publisher_id,
    p.company_name AS publisher_name,
    po.offering_type,
    po.base_price,
    po.turnaround_days,
    w.id AS website_id,
    w.domain,
    w.domain_rating,
    w.total_traffic,
    por.is_primary,
    por.verified_at
   FROM (((public.publisher_offerings po
     JOIN public.publisher_offering_relationships por ON ((po.id = por.offering_id)))
     JOIN public.websites w ON ((por.website_id = w.id)))
     JOIN public.publishers p ON ((por.publisher_id = p.id)))
  WHERE ((po.is_active = true) AND (por.is_active = true) AND ((p.status)::text = 'active'::text));


--
-- Name: v_publisher_performance_complete; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_publisher_performance_complete AS
 SELECT COALESCE(pp.publisher_id, p.id) AS publisher_id,
    w.id AS website_id,
    w.domain,
    pp.avg_response_time_hours AS response_time,
    pp.on_time_delivery_rate AS success_rate,
    pp.total_orders,
    pp.reliability_score,
    pp.client_satisfaction_score
   FROM (((public.websites w
     LEFT JOIN public.publisher_offering_relationships por ON ((w.id = por.website_id)))
     LEFT JOIN public.publishers p ON ((por.publisher_id = p.id)))
     LEFT JOIN public.publisher_performance pp ON (((p.id = pp.publisher_id) AND (w.id = pp.website_id))));


--
-- Name: webhook_security_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_security_logs (
    id integer NOT NULL,
    webhook_id character varying(255),
    ip_address character varying(45) NOT NULL,
    user_agent text,
    signature_valid boolean DEFAULT false,
    signature_provided character varying(255),
    timestamp_valid boolean DEFAULT false,
    ip_allowed boolean DEFAULT false,
    rate_limit_key character varying(255),
    requests_in_window integer DEFAULT 1,
    allowed boolean DEFAULT false,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: webhook_security_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhook_security_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_security_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhook_security_logs_id_seq OWNED BY public.webhook_security_logs.id;


--
-- Name: website_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    website_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    is_primary boolean DEFAULT false,
    has_paid_guest_post boolean DEFAULT false,
    has_swap_option boolean DEFAULT false,
    guest_post_cost numeric(10,2),
    link_insert_cost numeric(10,2),
    requirement character varying(50),
    status character varying(50) DEFAULT 'Active'::character varying,
    airtable_link_price_id character varying(255),
    last_contacted timestamp without time zone,
    response_rate numeric(5,2),
    average_response_time integer,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: website_qualifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_qualifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    website_id uuid NOT NULL,
    client_id uuid NOT NULL,
    project_id uuid,
    qualified_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    qualified_by uuid NOT NULL,
    status character varying(50) DEFAULT 'qualified'::character varying,
    reason text,
    notes text,
    imported_from character varying(50) DEFAULT 'airtable'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: website_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.website_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    website_id uuid,
    sync_type character varying(50) NOT NULL,
    action character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    airtable_record_id character varying(255),
    changes jsonb,
    error text,
    started_at timestamp without time zone NOT NULL,
    completed_at timestamp without time zone,
    records_processed integer DEFAULT 0
);


--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    step_id character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    inputs jsonb,
    outputs jsonb,
    completed_at timestamp without time zone,
    "position" integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    step_number integer DEFAULT 0 NOT NULL
);


--
-- Name: workflow_websites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_websites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    website_id uuid NOT NULL,
    step_added character varying(100) NOT NULL,
    usage_type character varying(50) NOT NULL,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: workflows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid,
    title character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    content jsonb,
    target_pages jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    order_item_id uuid
);


--
-- Name: migration_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_history ALTER COLUMN id SET DEFAULT nextval('public.migration_history_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: webhook_security_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_security_logs ALTER COLUMN id SET DEFAULT nextval('public.webhook_security_logs_id_seq'::regclass);


--
-- Name: accounts accounts_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_google_id_key UNIQUE (google_id);


--
-- Name: account_order_access advertiser_order_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_order_access
    ADD CONSTRAINT advertiser_order_access_pkey PRIMARY KEY (id);


--
-- Name: account_order_access advertiser_order_access_user_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_order_access
    ADD CONSTRAINT advertiser_order_access_user_id_order_id_key UNIQUE (user_id, order_id);


--
-- Name: accounts advertisers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT advertisers_email_key UNIQUE (email);


--
-- Name: accounts advertisers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT advertisers_pkey PRIMARY KEY (id);


--
-- Name: agent_sessions agent_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_sessions
    ADD CONSTRAINT agent_sessions_pkey PRIMARY KEY (id);


--
-- Name: airtable_sync_config airtable_sync_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airtable_sync_config
    ADD CONSTRAINT airtable_sync_config_key_key UNIQUE (key);


--
-- Name: airtable_sync_config airtable_sync_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airtable_sync_config
    ADD CONSTRAINT airtable_sync_config_pkey PRIMARY KEY (id);


--
-- Name: airtable_webhook_events airtable_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.airtable_webhook_events
    ADD CONSTRAINT airtable_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: article_sections article_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_sections
    ADD CONSTRAINT article_sections_pkey PRIMARY KEY (id);


--
-- Name: audit_sections audit_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_sections
    ADD CONSTRAINT audit_sections_pkey PRIMARY KEY (id);


--
-- Name: audit_sessions audit_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_sessions
    ADD CONSTRAINT audit_sessions_pkey PRIMARY KEY (id);


--
-- Name: benchmark_comparisons benchmark_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmark_comparisons
    ADD CONSTRAINT benchmark_comparisons_pkey PRIMARY KEY (id);


--
-- Name: bulk_analysis_domains bulk_analysis_domains_client_domain_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_client_domain_unique UNIQUE (client_id, domain);


--
-- Name: bulk_analysis_domains bulk_analysis_domains_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_pkey PRIMARY KEY (id);


--
-- Name: bulk_analysis_projects bulk_analysis_projects_client_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_projects
    ADD CONSTRAINT bulk_analysis_projects_client_id_name_key UNIQUE (client_id, name);


--
-- Name: bulk_analysis_projects bulk_analysis_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_projects
    ADD CONSTRAINT bulk_analysis_projects_pkey PRIMARY KEY (id);


--
-- Name: bulk_dataforseo_job_items bulk_dataforseo_job_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_dataforseo_job_items
    ADD CONSTRAINT bulk_dataforseo_job_items_pkey PRIMARY KEY (id);


--
-- Name: bulk_dataforseo_jobs bulk_dataforseo_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_dataforseo_jobs
    ADD CONSTRAINT bulk_dataforseo_jobs_pkey PRIMARY KEY (id);


--
-- Name: client_assignments client_assignments_client_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_assignments
    ADD CONSTRAINT client_assignments_client_id_user_id_key UNIQUE (client_id, user_id);


--
-- Name: client_assignments client_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_assignments
    ADD CONSTRAINT client_assignments_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: clients clients_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_share_token_key UNIQUE (share_token);


--
-- Name: commission_configurations commission_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_configurations
    ADD CONSTRAINT commission_configurations_pkey PRIMARY KEY (id);


--
-- Name: cron_jobs cron_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_jobs
    ADD CONSTRAINT cron_jobs_pkey PRIMARY KEY (id);


--
-- Name: dataforseo_api_logs dataforseo_api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataforseo_api_logs
    ADD CONSTRAINT dataforseo_api_logs_pkey PRIMARY KEY (id);


--
-- Name: domain_suggestions domain_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_suggestions
    ADD CONSTRAINT domain_suggestions_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_processing_logs email_processing_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_processing_logs
    ADD CONSTRAINT email_processing_logs_pkey PRIMARY KEY (id);


--
-- Name: email_review_queue email_review_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_review_queue
    ADD CONSTRAINT email_review_queue_pkey PRIMARY KEY (id);


--
-- Name: formatting_qa_checks formatting_qa_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formatting_qa_checks
    ADD CONSTRAINT formatting_qa_checks_pkey PRIMARY KEY (id);


--
-- Name: formatting_qa_sessions formatting_qa_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formatting_qa_sessions
    ADD CONSTRAINT formatting_qa_sessions_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: keyword_analysis_batches keyword_analysis_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_analysis_batches
    ADD CONSTRAINT keyword_analysis_batches_pkey PRIMARY KEY (id);


--
-- Name: keyword_analysis_results keyword_analysis_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_analysis_results
    ADD CONSTRAINT keyword_analysis_results_pkey PRIMARY KEY (id);


--
-- Name: keyword_search_history keyword_search_history_bulk_analysis_domain_id_keyword_loca_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_search_history
    ADD CONSTRAINT keyword_search_history_bulk_analysis_domain_id_keyword_loca_key UNIQUE (bulk_analysis_domain_id, keyword, location_code, language_code);


--
-- Name: keyword_search_history keyword_search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_search_history
    ADD CONSTRAINT keyword_search_history_pkey PRIMARY KEY (id);


--
-- Name: line_item_changes line_item_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_item_changes
    ADD CONSTRAINT line_item_changes_pkey PRIMARY KEY (id);


--
-- Name: line_item_templates line_item_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_item_templates
    ADD CONSTRAINT line_item_templates_pkey PRIMARY KEY (id);


--
-- Name: link_orchestration_sessions link_orchestration_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.link_orchestration_sessions
    ADD CONSTRAINT link_orchestration_sessions_pkey PRIMARY KEY (id);


--
-- Name: linkio_assets linkio_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_assets
    ADD CONSTRAINT linkio_assets_pkey PRIMARY KEY (id);


--
-- Name: linkio_blog_categories linkio_blog_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_blog_categories
    ADD CONSTRAINT linkio_blog_categories_category_name_key UNIQUE (category_name);


--
-- Name: linkio_blog_categories linkio_blog_categories_category_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_blog_categories
    ADD CONSTRAINT linkio_blog_categories_category_slug_key UNIQUE (category_slug);


--
-- Name: linkio_blog_categories linkio_blog_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_blog_categories
    ADD CONSTRAINT linkio_blog_categories_pkey PRIMARY KEY (id);


--
-- Name: linkio_components linkio_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_components
    ADD CONSTRAINT linkio_components_pkey PRIMARY KEY (id);


--
-- Name: linkio_pages linkio_pages_original_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_pages
    ADD CONSTRAINT linkio_pages_original_url_key UNIQUE (original_url);


--
-- Name: linkio_pages linkio_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_pages
    ADD CONSTRAINT linkio_pages_pkey PRIMARY KEY (id);


--
-- Name: master_qualification_job_items master_qualification_job_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_qualification_job_items
    ADD CONSTRAINT master_qualification_job_items_pkey PRIMARY KEY (id);


--
-- Name: master_qualification_jobs master_qualification_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_qualification_jobs
    ADD CONSTRAINT master_qualification_jobs_pkey PRIMARY KEY (id);


--
-- Name: migration_history migration_history_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_history
    ADD CONSTRAINT migration_history_migration_name_key UNIQUE (migration_name);


--
-- Name: migration_history migration_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_history
    ADD CONSTRAINT migration_history_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: order_benchmarks order_benchmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_benchmarks
    ADD CONSTRAINT order_benchmarks_pkey PRIMARY KEY (id);


--
-- Name: order_groups order_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_pkey PRIMARY KEY (id);


--
-- Name: guest_post_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_post_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_line_items order_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_pkey PRIMARY KEY (id);


--
-- Name: order_share_tokens order_share_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_share_tokens
    ADD CONSTRAINT order_share_tokens_pkey PRIMARY KEY (token);


--
-- Name: order_site_selections order_site_selections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_selections
    ADD CONSTRAINT order_site_selections_pkey PRIMARY KEY (id);


--
-- Name: order_site_submissions order_site_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_submissions
    ADD CONSTRAINT order_site_submissions_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_share_token_key UNIQUE (share_token);


--
-- Name: outline_sessions outline_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outline_sessions
    ADD CONSTRAINT outline_sessions_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: polish_sections polish_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polish_sections
    ADD CONSTRAINT polish_sections_pkey PRIMARY KEY (id);


--
-- Name: polish_sessions polish_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polish_sessions
    ADD CONSTRAINT polish_sessions_pkey PRIMARY KEY (id);


--
-- Name: pricing_rules pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_rules
    ADD CONSTRAINT pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: project_order_associations project_order_associations_order_group_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_order_associations
    ADD CONSTRAINT project_order_associations_order_group_id_project_id_key UNIQUE (order_group_id, project_id);


--
-- Name: project_order_associations project_order_associations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_order_associations
    ADD CONSTRAINT project_order_associations_pkey PRIMARY KEY (id);


--
-- Name: project_websites project_websites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_websites
    ADD CONSTRAINT project_websites_pkey PRIMARY KEY (id);


--
-- Name: project_websites project_websites_project_id_website_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_websites
    ADD CONSTRAINT project_websites_project_id_website_id_key UNIQUE (project_id, website_id);


--
-- Name: publisher_automation_logs publisher_automation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_automation_logs
    ADD CONSTRAINT publisher_automation_logs_pkey PRIMARY KEY (id);


--
-- Name: publisher_earnings publisher_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_earnings
    ADD CONSTRAINT publisher_earnings_pkey PRIMARY KEY (id);


--
-- Name: publisher_email_claims publisher_email_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_email_claims
    ADD CONSTRAINT publisher_email_claims_pkey PRIMARY KEY (id);


--
-- Name: publisher_email_claims publisher_email_claims_publisher_id_website_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_email_claims
    ADD CONSTRAINT publisher_email_claims_publisher_id_website_id_key UNIQUE (publisher_id, website_id);


--
-- Name: publisher_email_claims publisher_email_claims_verification_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_email_claims
    ADD CONSTRAINT publisher_email_claims_verification_token_key UNIQUE (verification_token);


--
-- Name: publisher_invoices publisher_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_invoices
    ADD CONSTRAINT publisher_invoices_pkey PRIMARY KEY (id);


--
-- Name: publisher_invoices publisher_invoices_publisher_id_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_invoices
    ADD CONSTRAINT publisher_invoices_publisher_id_invoice_number_key UNIQUE (publisher_id, invoice_number);


--
-- Name: publisher_offering_relationships publisher_offering_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_offering_relationships
    ADD CONSTRAINT publisher_offering_relationships_pkey PRIMARY KEY (id);


--
-- Name: publisher_offering_relationships publisher_offering_relationships_unique_offering; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_offering_relationships
    ADD CONSTRAINT publisher_offering_relationships_unique_offering UNIQUE (publisher_id, website_id, offering_id);


--
-- Name: CONSTRAINT publisher_offering_relationships_unique_offering ON publisher_offering_relationships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT publisher_offering_relationships_unique_offering ON public.publisher_offering_relationships IS 'Allows multiple offerings per publisher-website pair, but prevents duplicate offering relationships';


--
-- Name: publisher_offerings publisher_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_offerings
    ADD CONSTRAINT publisher_offerings_pkey PRIMARY KEY (id);


--
-- Name: publisher_order_analytics publisher_order_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_order_analytics
    ADD CONSTRAINT publisher_order_analytics_pkey PRIMARY KEY (id);


--
-- Name: publisher_order_analytics publisher_order_analytics_publisher_id_website_id_period_ty_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_order_analytics
    ADD CONSTRAINT publisher_order_analytics_publisher_id_website_id_period_ty_key UNIQUE (publisher_id, website_id, period_type, period_date);


--
-- Name: publisher_order_notifications publisher_order_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_order_notifications
    ADD CONSTRAINT publisher_order_notifications_pkey PRIMARY KEY (id);


--
-- Name: publisher_payment_batches publisher_payment_batches_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payment_batches
    ADD CONSTRAINT publisher_payment_batches_batch_number_key UNIQUE (batch_number);


--
-- Name: publisher_payment_batches publisher_payment_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payment_batches
    ADD CONSTRAINT publisher_payment_batches_pkey PRIMARY KEY (id);


--
-- Name: publisher_payment_profiles publisher_payment_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payment_profiles
    ADD CONSTRAINT publisher_payment_profiles_pkey PRIMARY KEY (id);


--
-- Name: publisher_payouts publisher_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payouts
    ADD CONSTRAINT publisher_payouts_pkey PRIMARY KEY (id);


--
-- Name: publisher_performance publisher_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_performance
    ADD CONSTRAINT publisher_performance_pkey PRIMARY KEY (id);


--
-- Name: publisher_performance publisher_performance_publisher_id_website_id_period_start__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_performance
    ADD CONSTRAINT publisher_performance_publisher_id_website_id_period_start__key UNIQUE (publisher_id, website_id, period_start, period_end);


--
-- Name: publisher_pricing_rules publisher_pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_pricing_rules
    ADD CONSTRAINT publisher_pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: publisher_websites publisher_websites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_websites
    ADD CONSTRAINT publisher_websites_pkey PRIMARY KEY (id);


--
-- Name: publishers publishers_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publishers
    ADD CONSTRAINT publishers_google_id_key UNIQUE (google_id);


--
-- Name: publishers publishers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publishers
    ADD CONSTRAINT publishers_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: shadow_publisher_websites shadow_publisher_websites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_publisher_websites
    ADD CONSTRAINT shadow_publisher_websites_pkey PRIMARY KEY (id);


--
-- Name: stripe_customers stripe_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT stripe_customers_pkey PRIMARY KEY (id);


--
-- Name: stripe_customers stripe_customers_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT stripe_customers_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: stripe_payment_intents stripe_payment_intents_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_intents
    ADD CONSTRAINT stripe_payment_intents_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: stripe_payment_intents stripe_payment_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_intents
    ADD CONSTRAINT stripe_payment_intents_pkey PRIMARY KEY (id);


--
-- Name: stripe_payment_intents stripe_payment_intents_stripe_payment_intent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_intents
    ADD CONSTRAINT stripe_payment_intents_stripe_payment_intent_id_key UNIQUE (stripe_payment_intent_id);


--
-- Name: stripe_webhooks stripe_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhooks
    ADD CONSTRAINT stripe_webhooks_pkey PRIMARY KEY (id);


--
-- Name: stripe_webhooks stripe_webhooks_stripe_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhooks
    ADD CONSTRAINT stripe_webhooks_stripe_event_id_key UNIQUE (stripe_event_id);


--
-- Name: target_pages target_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_pages
    ADD CONSTRAINT target_pages_pkey PRIMARY KEY (id);


--
-- Name: shadow_publisher_websites unique_shadow_publisher_website; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_publisher_websites
    ADD CONSTRAINT unique_shadow_publisher_website UNIQUE (publisher_id, website_id);


--
-- Name: user_client_access user_client_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_pkey PRIMARY KEY (id);


--
-- Name: user_client_access user_client_access_user_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_user_id_client_id_key UNIQUE (user_id, client_id);


--
-- Name: user_website_access user_website_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_website_access
    ADD CONSTRAINT user_website_access_pkey PRIMARY KEY (id);


--
-- Name: user_website_access user_website_access_user_id_website_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_website_access
    ADD CONSTRAINT user_website_access_user_id_website_id_key UNIQUE (user_id, website_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: v2_agent_sessions v2_agent_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.v2_agent_sessions
    ADD CONSTRAINT v2_agent_sessions_pkey PRIMARY KEY (id);


--
-- Name: webhook_security_logs webhook_security_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_security_logs
    ADD CONSTRAINT webhook_security_logs_pkey PRIMARY KEY (id);


--
-- Name: website_contacts website_contacts_airtable_link_price_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_contacts
    ADD CONSTRAINT website_contacts_airtable_link_price_id_key UNIQUE (airtable_link_price_id);


--
-- Name: website_contacts website_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_contacts
    ADD CONSTRAINT website_contacts_pkey PRIMARY KEY (id);


--
-- Name: website_contacts website_contacts_website_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_contacts
    ADD CONSTRAINT website_contacts_website_id_email_key UNIQUE (website_id, email);


--
-- Name: website_qualifications website_qualifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_qualifications
    ADD CONSTRAINT website_qualifications_pkey PRIMARY KEY (id);


--
-- Name: website_qualifications website_qualifications_website_id_client_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_qualifications
    ADD CONSTRAINT website_qualifications_website_id_client_id_project_id_key UNIQUE (website_id, client_id, project_id);


--
-- Name: website_sync_logs website_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_sync_logs
    ADD CONSTRAINT website_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: websites websites_airtable_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.websites
    ADD CONSTRAINT websites_airtable_id_key UNIQUE (airtable_id);


--
-- Name: websites websites_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.websites
    ADD CONSTRAINT websites_domain_key UNIQUE (domain);


--
-- Name: websites websites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.websites
    ADD CONSTRAINT websites_pkey PRIMARY KEY (id);


--
-- Name: workflow_steps workflow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);


--
-- Name: workflow_websites workflow_websites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_websites
    ADD CONSTRAINT workflow_websites_pkey PRIMARY KEY (id);


--
-- Name: workflow_websites workflow_websites_workflow_id_website_id_step_added_usage_t_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_websites
    ADD CONSTRAINT workflow_websites_workflow_id_website_id_step_added_usage_t_key UNIQUE (workflow_id, website_id, step_added, usage_type);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: formatting_qa_checks_qa_session_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX formatting_qa_checks_qa_session_id_idx ON public.formatting_qa_checks USING btree (qa_session_id);


--
-- Name: formatting_qa_checks_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX formatting_qa_checks_status_idx ON public.formatting_qa_checks USING btree (status);


--
-- Name: formatting_qa_checks_workflow_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX formatting_qa_checks_workflow_id_idx ON public.formatting_qa_checks USING btree (workflow_id);


--
-- Name: formatting_qa_sessions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX formatting_qa_sessions_status_idx ON public.formatting_qa_sessions USING btree (status);


--
-- Name: formatting_qa_sessions_workflow_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX formatting_qa_sessions_workflow_id_idx ON public.formatting_qa_sessions USING btree (workflow_id);


--
-- Name: idx_accounts_auth_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_auth_method ON public.accounts USING btree (auth_method);


--
-- Name: idx_accounts_google_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_google_id ON public.accounts USING btree (google_id);


--
-- Name: idx_accounts_onboarding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_onboarding ON public.accounts USING btree (onboarding_completed);


--
-- Name: idx_advertisers_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advertisers_client ON public.accounts USING btree (primary_client_id);


--
-- Name: idx_advertisers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_advertisers_email ON public.accounts USING btree (email);


--
-- Name: idx_advertisers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advertisers_status ON public.accounts USING btree (status);


--
-- Name: idx_agent_sessions_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_sessions_workflow_id ON public.agent_sessions USING btree (workflow_id);


--
-- Name: idx_article_sections_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_article_sections_workflow_id ON public.article_sections USING btree (workflow_id);


--
-- Name: idx_automation_logs_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_logs_publisher ON public.publisher_automation_logs USING btree (publisher_id);


--
-- Name: idx_benchmarks_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_benchmarks_order ON public.order_benchmarks USING btree (order_id);


--
-- Name: idx_benchmarks_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_benchmarks_type ON public.order_benchmarks USING btree (benchmark_type);


--
-- Name: idx_bulk_analysis_domains_airtable_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_analysis_domains_airtable_record_id ON public.bulk_analysis_domains USING btree (airtable_record_id);


--
-- Name: idx_bulk_analysis_domains_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_analysis_domains_client_id ON public.bulk_analysis_domains USING btree (client_id);


--
-- Name: idx_bulk_analysis_domains_client_status_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_analysis_domains_client_status_workflow ON public.bulk_analysis_domains USING btree (client_id, qualification_status, has_workflow);


--
-- Name: idx_bulk_analysis_domains_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_analysis_domains_created_at ON public.bulk_analysis_domains USING btree (created_at DESC);


--
-- Name: idx_bulk_analysis_domains_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_analysis_domains_domain ON public.bulk_analysis_domains USING btree (domain);


--
-- Name: idx_bulk_analysis_domains_has_workflow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_analysis_domains_has_workflow ON public.bulk_analysis_domains USING btree (has_workflow);


--
-- Name: idx_bulk_analysis_domains_qualification_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_analysis_domains_qualification_status ON public.bulk_analysis_domains USING btree (qualification_status);


--
-- Name: idx_bulk_analysis_domains_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_analysis_domains_status ON public.bulk_analysis_domains USING btree (qualification_status);


--
-- Name: idx_bulk_domains_duplicate_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_domains_duplicate_of ON public.bulk_analysis_domains USING btree (duplicate_of);


--
-- Name: idx_bulk_domains_original_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_domains_original_project ON public.bulk_analysis_domains USING btree (original_project_id);


--
-- Name: idx_bulk_domains_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_domains_project ON public.bulk_analysis_domains USING btree (project_id) WHERE (project_id IS NOT NULL);


--
-- Name: idx_bulk_domains_project_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_domains_project_status ON public.bulk_analysis_domains USING btree (project_id, qualification_status);


--
-- Name: idx_bulk_domains_resolution; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_domains_resolution ON public.bulk_analysis_domains USING btree (duplicate_resolution);


--
-- Name: idx_bulk_normalized_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_normalized_domain ON public.bulk_analysis_domains USING btree (normalized_domain);


--
-- Name: idx_bulk_projects_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_projects_client ON public.bulk_analysis_projects USING btree (client_id);


--
-- Name: idx_changes_line_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_changes_line_item ON public.line_item_changes USING btree (line_item_id);


--
-- Name: idx_client_assignments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_assignments_user_id ON public.client_assignments USING btree (user_id);


--
-- Name: idx_clients_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_account_id ON public.clients USING btree (account_id) WHERE (account_id IS NOT NULL);


--
-- Name: idx_clients_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_share_token ON public.clients USING btree (share_token) WHERE (share_token IS NOT NULL);


--
-- Name: idx_clients_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_type ON public.clients USING btree (client_type);


--
-- Name: idx_commission_config_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_config_active ON public.commission_configurations USING btree (is_active);


--
-- Name: idx_commission_config_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_config_scope ON public.commission_configurations USING btree (scope_type, scope_id);


--
-- Name: idx_commission_config_unique_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_commission_config_unique_scope ON public.commission_configurations USING btree (scope_type, scope_id) WHERE ((is_active = true) AND (valid_until IS NULL));


--
-- Name: idx_comparison_benchmark; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comparison_benchmark ON public.benchmark_comparisons USING btree (benchmark_id);


--
-- Name: idx_comparison_latest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comparison_latest ON public.benchmark_comparisons USING btree (order_id, compared_at DESC);


--
-- Name: idx_comparison_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comparison_order ON public.benchmark_comparisons USING btree (order_id);


--
-- Name: idx_cron_jobs_next_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cron_jobs_next_run ON public.cron_jobs USING btree (next_run_at) WHERE (enabled = true);


--
-- Name: idx_dataforseo_logs_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dataforseo_logs_client_id ON public.dataforseo_api_logs USING btree (client_id);


--
-- Name: idx_dataforseo_logs_domain_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dataforseo_logs_domain_id ON public.dataforseo_api_logs USING btree (domain_id);


--
-- Name: idx_dataforseo_logs_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dataforseo_logs_requested_at ON public.dataforseo_api_logs USING btree (requested_at DESC);


--
-- Name: idx_dataforseo_logs_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dataforseo_logs_task_id ON public.dataforseo_api_logs USING btree (task_id);


--
-- Name: idx_domain_suggestions_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_domain_suggestions_unique ON public.domain_suggestions USING btree (account_id, domain_id) WHERE (account_id IS NOT NULL);


--
-- Name: idx_domain_suggestions_unique_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_domain_suggestions_unique_email ON public.domain_suggestions USING btree (account_email, domain_id) WHERE (account_id IS NULL);


--
-- Name: idx_email_claims_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_claims_publisher ON public.publisher_email_claims USING btree (publisher_id);


--
-- Name: idx_email_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_claims_status ON public.publisher_email_claims USING btree (status);


--
-- Name: idx_email_claims_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_claims_token ON public.publisher_email_claims USING btree (verification_token);


--
-- Name: idx_email_claims_website; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_claims_website ON public.publisher_email_claims USING btree (website_id);


--
-- Name: idx_email_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_created_at ON public.email_logs USING btree (created_at);


--
-- Name: idx_email_logs_email_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_email_from ON public.email_processing_logs USING btree (lower((email_from)::text));


--
-- Name: idx_email_logs_recipients; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_recipients ON public.email_logs USING gin (recipients);


--
-- Name: idx_email_logs_resend_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_resend_id ON public.email_logs USING btree (resend_id);


--
-- Name: idx_email_logs_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_sent_at ON public.email_logs USING btree (sent_at);


--
-- Name: idx_email_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_status ON public.email_logs USING btree (status);


--
-- Name: idx_email_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_logs_type ON public.email_logs USING btree (type);


--
-- Name: idx_guest_post_items_domain_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_post_items_domain_id ON public.guest_post_items USING btree (domain_id);


--
-- Name: idx_guest_post_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_post_items_order_id ON public.guest_post_items USING btree (order_id);


--
-- Name: idx_guest_post_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_post_items_status ON public.guest_post_items USING btree (status);


--
-- Name: idx_guest_post_items_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guest_post_items_workflow_id ON public.guest_post_items USING btree (workflow_id);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);


--
-- Name: idx_invitations_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_expires_at ON public.invitations USING btree (expires_at);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: idx_invoices_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_order_id ON public.invoices USING btree (order_id);


--
-- Name: idx_invoices_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_payment_id ON public.invoices USING btree (payment_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_keyword_analysis_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_analysis_domain ON public.keyword_analysis_results USING btree (bulk_analysis_domain_id);


--
-- Name: idx_keyword_analysis_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_analysis_position ON public.keyword_analysis_results USING btree ("position");


--
-- Name: idx_keyword_analysis_results_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_analysis_results_batch ON public.keyword_analysis_results USING btree (analysis_batch_id, created_at DESC);


--
-- Name: idx_keyword_analysis_results_keyword_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_analysis_results_keyword_domain ON public.keyword_analysis_results USING btree (bulk_analysis_domain_id, keyword);


--
-- Name: idx_keyword_search_history_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_search_history_domain ON public.keyword_search_history USING btree (bulk_analysis_domain_id);


--
-- Name: idx_keyword_search_history_searched_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_keyword_search_history_searched_at ON public.keyword_search_history USING btree (searched_at);


--
-- Name: idx_line_items_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_client ON public.order_line_items USING btree (client_id);


--
-- Name: idx_line_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_order ON public.order_line_items USING btree (order_id);


--
-- Name: idx_line_items_publisher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_publisher_id ON public.order_line_items USING btree (publisher_id);


--
-- Name: idx_line_items_publisher_offering; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_publisher_offering ON public.order_line_items USING btree (publisher_offering_id);


--
-- Name: idx_line_items_publisher_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_publisher_status ON public.order_line_items USING btree (publisher_status);


--
-- Name: idx_line_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_line_items_status ON public.order_line_items USING btree (status);


--
-- Name: idx_link_orchestration_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_link_orchestration_status ON public.link_orchestration_sessions USING btree (status);


--
-- Name: idx_link_orchestration_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_link_orchestration_workflow_id ON public.link_orchestration_sessions USING btree (workflow_id);


--
-- Name: idx_linkio_assets_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linkio_assets_page_id ON public.linkio_assets USING btree (page_id);


--
-- Name: idx_linkio_components_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linkio_components_page_id ON public.linkio_components USING btree (page_id);


--
-- Name: idx_linkio_pages_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linkio_pages_priority ON public.linkio_pages USING btree (priority);


--
-- Name: idx_linkio_pages_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linkio_pages_status ON public.linkio_pages USING btree (recreation_status);


--
-- Name: idx_linkio_pages_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_linkio_pages_type ON public.linkio_pages USING btree (page_type);


--
-- Name: idx_migration_history_executed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_history_executed ON public.migration_history USING btree (executed_at DESC);


--
-- Name: idx_migration_history_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_history_name ON public.migration_history USING btree (migration_name);


--
-- Name: idx_order_benchmarks_latest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_benchmarks_latest ON public.order_benchmarks USING btree (order_id, is_latest) WHERE (is_latest = true);


--
-- Name: idx_order_benchmarks_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_benchmarks_order_id ON public.order_benchmarks USING btree (order_id);


--
-- Name: idx_order_groups_analysis; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_analysis ON public.order_groups USING btree (bulk_analysis_project_id);


--
-- Name: idx_order_groups_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_client ON public.order_groups USING btree (client_id);


--
-- Name: idx_order_groups_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_groups_order ON public.order_groups USING btree (order_id);


--
-- Name: idx_order_items_target_page_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_target_page_id ON public.guest_post_items USING btree (target_page_id);


--
-- Name: idx_order_line_items_publisher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_line_items_publisher_id ON public.order_line_items USING btree (publisher_id);


--
-- Name: idx_order_line_items_publisher_offering; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_line_items_publisher_offering ON public.order_line_items USING btree (publisher_offering_id);


--
-- Name: idx_order_line_items_publisher_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_line_items_publisher_status ON public.order_line_items USING btree (publisher_status);


--
-- Name: idx_orders_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_advertiser ON public.orders USING btree (account_id);


--
-- Name: idx_orders_advertiser_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_advertiser_id ON public.orders USING btree (account_id);


--
-- Name: idx_orders_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_by ON public.orders USING btree (created_by);


--
-- Name: idx_orders_order_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_type ON public.orders USING btree (order_type);


--
-- Name: idx_orders_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_share_token ON public.orders USING btree (share_token);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_outline_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outline_sessions_active ON public.outline_sessions USING btree (workflow_id, is_active) WHERE (is_active = true);


--
-- Name: idx_outline_sessions_response_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outline_sessions_response_id ON public.outline_sessions USING btree (background_response_id);


--
-- Name: idx_outline_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outline_sessions_status ON public.outline_sessions USING btree (status);


--
-- Name: idx_outline_sessions_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outline_sessions_version ON public.outline_sessions USING btree (workflow_id, version DESC);


--
-- Name: idx_outline_sessions_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outline_sessions_workflow_id ON public.outline_sessions USING btree (workflow_id);


--
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_payment_batches_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_batches_created ON public.publisher_payment_batches USING btree (created_at);


--
-- Name: idx_payment_batches_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_batches_publisher ON public.publisher_payment_batches USING btree (publisher_id);


--
-- Name: idx_payment_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_batches_status ON public.publisher_payment_batches USING btree (status);


--
-- Name: idx_payments_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_account ON public.payments USING btree (account_id);


--
-- Name: idx_payments_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_account_id ON public.payments USING btree (account_id);


--
-- Name: idx_payments_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order ON public.payments USING btree (order_id);


--
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_stripe_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_stripe_intent ON public.payments USING btree (stripe_payment_intent_id);


--
-- Name: idx_payouts_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_publisher ON public.publisher_payouts USING btree (publisher_id);


--
-- Name: idx_payouts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_status ON public.publisher_payouts USING btree (status);


--
-- Name: idx_performance_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_period ON public.publisher_performance USING btree (period_start, period_end);


--
-- Name: idx_performance_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_publisher ON public.publisher_performance USING btree (publisher_id);


--
-- Name: idx_performance_website; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_website ON public.publisher_performance USING btree (website_id);


--
-- Name: idx_pricing_rules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_active ON public.publisher_pricing_rules USING btree (is_active);


--
-- Name: idx_pricing_rules_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_client ON public.pricing_rules USING btree (client_id);


--
-- Name: idx_pricing_rules_offering; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_offering ON public.publisher_pricing_rules USING btree (publisher_offering_id);


--
-- Name: idx_pricing_rules_quantity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pricing_rules_quantity ON public.pricing_rules USING btree (min_quantity, max_quantity);


--
-- Name: idx_proj_order_assoc_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proj_order_assoc_order ON public.project_order_associations USING btree (order_id);


--
-- Name: idx_proj_order_assoc_order_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proj_order_assoc_order_group ON public.project_order_associations USING btree (order_group_id);


--
-- Name: idx_proj_order_assoc_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proj_order_assoc_project ON public.project_order_associations USING btree (project_id);


--
-- Name: idx_project_websites_added_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_websites_added_by ON public.project_websites USING btree (added_by);


--
-- Name: idx_project_websites_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_websites_project_id ON public.project_websites USING btree (project_id);


--
-- Name: idx_project_websites_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_websites_status ON public.project_websites USING btree (analysis_status);


--
-- Name: idx_project_websites_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_websites_website_id ON public.project_websites USING btree (website_id);


--
-- Name: idx_publisher_analytics_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_analytics_period ON public.publisher_order_analytics USING btree (period_type, period_date);


--
-- Name: idx_publisher_analytics_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_analytics_publisher ON public.publisher_order_analytics USING btree (publisher_id);


--
-- Name: idx_publisher_analytics_website; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_analytics_website ON public.publisher_order_analytics USING btree (website_id);


--
-- Name: idx_publisher_earnings_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_earnings_created ON public.publisher_earnings USING btree (created_at);


--
-- Name: idx_publisher_earnings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_earnings_created_at ON public.publisher_earnings USING btree (created_at);


--
-- Name: idx_publisher_earnings_payment_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_earnings_payment_batch ON public.publisher_earnings USING btree (payment_batch_id);


--
-- Name: idx_publisher_earnings_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_earnings_publisher ON public.publisher_earnings USING btree (publisher_id);


--
-- Name: idx_publisher_earnings_publisher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_earnings_publisher_id ON public.publisher_earnings USING btree (publisher_id);


--
-- Name: idx_publisher_earnings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_earnings_status ON public.publisher_earnings USING btree (status);


--
-- Name: idx_publisher_invoices_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_invoices_created_at ON public.publisher_invoices USING btree (created_at);


--
-- Name: idx_publisher_invoices_publisher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_invoices_publisher_id ON public.publisher_invoices USING btree (publisher_id);


--
-- Name: idx_publisher_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_invoices_status ON public.publisher_invoices USING btree (status);


--
-- Name: idx_publisher_notifications_line_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_notifications_line_item ON public.publisher_order_notifications USING btree (order_line_item_id);


--
-- Name: idx_publisher_notifications_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_notifications_publisher ON public.publisher_order_notifications USING btree (publisher_id);


--
-- Name: idx_publisher_notifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_notifications_status ON public.publisher_order_notifications USING btree (status);


--
-- Name: idx_publisher_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_notifications_type ON public.publisher_order_notifications USING btree (notification_type);


--
-- Name: idx_publisher_offering_rel_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_offering_rel_priority ON public.publisher_offering_relationships USING btree (website_id, priority_rank);


--
-- Name: idx_publisher_offering_rel_verification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_offering_rel_verification ON public.publisher_offering_relationships USING btree (verification_status);


--
-- Name: idx_publisher_offerings_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_offerings_active ON public.publisher_offerings USING btree (is_active);


--
-- Name: idx_publisher_offerings_publisher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_offerings_publisher_id ON public.publisher_offerings USING btree (publisher_id);


--
-- Name: idx_publisher_offerings_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_offerings_type ON public.publisher_offerings USING btree (offering_type);


--
-- Name: idx_publisher_payment_profiles_publisher_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_payment_profiles_publisher_id ON public.publisher_payment_profiles USING btree (publisher_id);


--
-- Name: idx_publisher_relationships_offering; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_relationships_offering ON public.publisher_offering_relationships USING btree (offering_id);


--
-- Name: idx_publisher_relationships_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_relationships_publisher ON public.publisher_offering_relationships USING btree (publisher_id);


--
-- Name: idx_publisher_relationships_website; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_relationships_website ON public.publisher_offering_relationships USING btree (website_id);


--
-- Name: idx_publisher_website_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_publisher_website_unique ON public.publisher_websites USING btree (publisher_id, website_id);


--
-- Name: idx_publisher_websites_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_websites_publisher ON public.publisher_websites USING btree (publisher_id);


--
-- Name: idx_publisher_websites_website; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publisher_websites_website ON public.publisher_websites USING btree (website_id);


--
-- Name: idx_publishers_account_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publishers_account_status ON public.publishers USING btree (account_status);


--
-- Name: idx_publishers_auth_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publishers_auth_method ON public.publishers USING btree (auth_method);


--
-- Name: idx_publishers_claimed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publishers_claimed_at ON public.publishers USING btree (claimed_at) WHERE (claimed_at IS NOT NULL);


--
-- Name: idx_publishers_confidence_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publishers_confidence_score ON public.publishers USING btree (confidence_score) WHERE (confidence_score IS NOT NULL);


--
-- Name: idx_publishers_email_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_publishers_email_active ON public.publishers USING btree (lower((email)::text)) WHERE ((account_status)::text <> ALL ((ARRAY['unclaimed'::character varying, 'shadow'::character varying])::text[]));


--
-- Name: idx_publishers_google_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publishers_google_id ON public.publishers USING btree (google_id);


--
-- Name: idx_publishers_invitation_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publishers_invitation_token ON public.publishers USING btree (invitation_token) WHERE (invitation_token IS NOT NULL);


--
-- Name: idx_publishers_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publishers_source ON public.publishers USING btree (source);


--
-- Name: idx_publishers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_publishers_status ON public.publishers USING btree (status);


--
-- Name: idx_refunds_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_order ON public.refunds USING btree (order_id);


--
-- Name: idx_refunds_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_payment ON public.refunds USING btree (payment_id);


--
-- Name: idx_refunds_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_status ON public.refunds USING btree (status);


--
-- Name: idx_refunds_stripe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_refunds_stripe_id ON public.refunds USING btree (stripe_refund_id);


--
-- Name: idx_review_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_queue_status ON public.email_review_queue USING btree (status);


--
-- Name: idx_selections_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selections_domain ON public.order_site_selections USING btree (domain_id);


--
-- Name: idx_selections_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selections_group ON public.order_site_selections USING btree (order_group_id);


--
-- Name: idx_selections_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selections_status ON public.order_site_selections USING btree (status);


--
-- Name: idx_stripe_customers_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_customers_account ON public.stripe_customers USING btree (account_id);


--
-- Name: idx_stripe_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_customers_email ON public.stripe_customers USING btree (email);


--
-- Name: idx_stripe_customers_stripe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_customers_stripe_id ON public.stripe_customers USING btree (stripe_customer_id);


--
-- Name: idx_stripe_payment_intents_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_intents_customer ON public.stripe_payment_intents USING btree (stripe_customer_id);


--
-- Name: idx_stripe_payment_intents_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_intents_order_id ON public.stripe_payment_intents USING btree (order_id);


--
-- Name: idx_stripe_payment_intents_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_intents_status ON public.stripe_payment_intents USING btree (status);


--
-- Name: idx_stripe_payment_intents_stripe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_payment_intents_stripe_id ON public.stripe_payment_intents USING btree (stripe_payment_intent_id);


--
-- Name: idx_stripe_webhooks_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhooks_created ON public.stripe_webhooks USING btree (created_at);


--
-- Name: idx_stripe_webhooks_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhooks_event_id ON public.stripe_webhooks USING btree (stripe_event_id);


--
-- Name: idx_stripe_webhooks_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhooks_order ON public.stripe_webhooks USING btree (order_id);


--
-- Name: idx_stripe_webhooks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhooks_status ON public.stripe_webhooks USING btree (status);


--
-- Name: idx_stripe_webhooks_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stripe_webhooks_type ON public.stripe_webhooks USING btree (event_type);


--
-- Name: idx_submissions_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_domain ON public.order_site_submissions USING btree (domain_id);


--
-- Name: idx_submissions_inclusion_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_inclusion_status ON public.order_site_submissions USING btree (inclusion_status);


--
-- Name: idx_submissions_order_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_order_group ON public.order_site_submissions USING btree (order_group_id);


--
-- Name: idx_submissions_pool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_pool ON public.order_site_submissions USING btree (order_group_id, selection_pool, pool_rank);


--
-- Name: idx_submissions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_submissions_status ON public.order_site_submissions USING btree (submission_status);


--
-- Name: idx_suggestions_advertiser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suggestions_advertiser ON public.domain_suggestions USING btree (account_id, account_email);


--
-- Name: idx_suggestions_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suggestions_domain ON public.domain_suggestions USING btree (domain_id);


--
-- Name: idx_suggestions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suggestions_status ON public.domain_suggestions USING btree (status);


--
-- Name: idx_sync_logs_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_logs_started ON public.website_sync_logs USING btree (started_at);


--
-- Name: idx_sync_logs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_logs_type ON public.website_sync_logs USING btree (sync_type);


--
-- Name: idx_sync_logs_website; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_logs_website ON public.website_sync_logs USING btree (website_id);


--
-- Name: idx_target_pages_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_pages_client_id ON public.target_pages USING btree (client_id);


--
-- Name: idx_target_pages_client_normalized_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_pages_client_normalized_url ON public.target_pages USING btree (client_id, normalized_url);


--
-- Name: idx_target_pages_normalized_url; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_pages_normalized_url ON public.target_pages USING btree (normalized_url);


--
-- Name: idx_user_client_access_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_client_access_client_id ON public.user_client_access USING btree (client_id);


--
-- Name: idx_user_client_access_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_client_access_user_id ON public.user_client_access USING btree (user_id);


--
-- Name: idx_user_website_access_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_website_access_user_id ON public.user_website_access USING btree (user_id);


--
-- Name: idx_user_website_access_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_website_access_website_id ON public.user_website_access USING btree (website_id);


--
-- Name: idx_users_auth_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_auth_method ON public.users USING btree (auth_method);


--
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- Name: idx_users_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_user_type ON public.users USING btree (user_type);


--
-- Name: idx_v2_agent_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_v2_agent_sessions_status ON public.v2_agent_sessions USING btree (status);


--
-- Name: idx_v2_agent_sessions_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_v2_agent_sessions_workflow_id ON public.v2_agent_sessions USING btree (workflow_id);


--
-- Name: idx_v2_agent_sessions_workflow_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_v2_agent_sessions_workflow_version ON public.v2_agent_sessions USING btree (workflow_id, version);


--
-- Name: idx_webhook_events_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_processed ON public.airtable_webhook_events USING btree (processed, received_at);


--
-- Name: idx_webhook_events_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_record ON public.airtable_webhook_events USING btree (record_id);


--
-- Name: idx_webhook_security_logs_allowed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_security_logs_allowed ON public.webhook_security_logs USING btree (allowed);


--
-- Name: idx_webhook_security_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_security_logs_created_at ON public.webhook_security_logs USING btree (created_at DESC);


--
-- Name: idx_webhook_security_logs_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_security_logs_ip_address ON public.webhook_security_logs USING btree (ip_address);


--
-- Name: idx_webhook_security_logs_rate_limit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_security_logs_rate_limit ON public.webhook_security_logs USING btree (rate_limit_key, created_at DESC);


--
-- Name: idx_webhook_security_logs_webhook_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_security_logs_webhook_id ON public.webhook_security_logs USING btree (webhook_id);


--
-- Name: idx_website_contacts_website_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_contacts_website_primary ON public.website_contacts USING btree (website_id, is_primary);


--
-- Name: idx_website_qualifications_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_qualifications_client ON public.website_qualifications USING btree (client_id);


--
-- Name: idx_website_qualifications_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_website_qualifications_project ON public.website_qualifications USING btree (project_id);


--
-- Name: idx_websites_added_by_publisher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_added_by_publisher ON public.websites USING btree (added_by_publisher_id) WHERE (added_by_publisher_id IS NOT NULL);


--
-- Name: idx_websites_added_by_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_added_by_user ON public.websites USING btree (added_by_user_id) WHERE (added_by_user_id IS NOT NULL);


--
-- Name: idx_websites_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_domain ON public.websites USING btree (domain);


--
-- Name: idx_websites_domain_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_domain_rating ON public.websites USING btree (domain_rating);


--
-- Name: idx_websites_niche; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_niche ON public.websites USING gin (niche);


--
-- Name: idx_websites_normalized_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_normalized_domain ON public.websites USING btree (normalized_domain);


--
-- Name: idx_websites_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_source ON public.websites USING btree (source);


--
-- Name: idx_websites_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_status ON public.websites USING btree (status);


--
-- Name: idx_websites_total_traffic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_total_traffic ON public.websites USING btree (total_traffic);


--
-- Name: idx_websites_website_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_websites_website_type ON public.websites USING gin (website_type);


--
-- Name: idx_workflow_steps_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps USING btree (workflow_id);


--
-- Name: idx_workflow_websites_usage_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_websites_usage_type ON public.workflow_websites USING btree (usage_type);


--
-- Name: idx_workflow_websites_website_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_websites_website_id ON public.workflow_websites USING btree (website_id);


--
-- Name: idx_workflow_websites_workflow_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_websites_workflow_id ON public.workflow_websites USING btree (workflow_id);


--
-- Name: idx_workflows_order_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_order_item ON public.workflows USING btree (order_item_id);


--
-- Name: idx_workflows_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflows_user_id ON public.workflows USING btree (user_id);


--
-- Name: line_items_assigned_domain_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX line_items_assigned_domain_idx ON public.order_line_items USING btree (assigned_domain_id);


--
-- Name: line_items_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX line_items_client_id_idx ON public.order_line_items USING btree (client_id);


--
-- Name: line_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX line_items_order_id_idx ON public.order_line_items USING btree (order_id);


--
-- Name: line_items_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX line_items_status_idx ON public.order_line_items USING btree (status);


--
-- Name: uk_bulk_analysis_domains_client_domain_project; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uk_bulk_analysis_domains_client_domain_project ON public.bulk_analysis_domains USING btree (client_id, domain, project_id);


--
-- Name: order_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.order_summary AS
 SELECT o.id,
    o.account_id,
    o.state,
    o.status,
    o.total_retail,
    count(DISTINCT og.id) AS client_count,
    sum(og.link_count) AS total_links,
    count(DISTINCT oss.id) FILTER (WHERE ((oss.status)::text = 'approved'::text)) AS approved_sites,
    o.created_at,
    o.updated_at
   FROM ((public.orders o
     LEFT JOIN public.order_groups og ON ((og.order_id = o.id)))
     LEFT JOIN public.order_site_selections oss ON ((oss.order_group_id = og.id)))
  GROUP BY o.id;


--
-- Name: bulk_analysis_domains normalize_bulk_domain_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER normalize_bulk_domain_trigger BEFORE INSERT OR UPDATE OF domain ON public.bulk_analysis_domains FOR EACH ROW EXECUTE FUNCTION public.trigger_normalize_domain();


--
-- Name: websites normalize_website_domain_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER normalize_website_domain_trigger BEFORE INSERT OR UPDATE OF domain ON public.websites FOR EACH ROW EXECUTE FUNCTION public.trigger_normalize_domain();


--
-- Name: publishers publisher_status_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER publisher_status_change_trigger AFTER UPDATE ON public.publishers FOR EACH ROW EXECUTE FUNCTION public.log_publisher_status_change();


--
-- Name: order_line_items trigger_create_publisher_earning; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_publisher_earning AFTER UPDATE ON public.order_line_items FOR EACH ROW EXECUTE FUNCTION public.create_publisher_earning_on_completion();


--
-- Name: airtable_sync_config update_airtable_sync_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_airtable_sync_config_updated_at BEFORE UPDATE ON public.airtable_sync_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_logs update_email_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON public.email_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invitations update_invitations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: publisher_performance update_performance_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_performance_timestamp BEFORE UPDATE ON public.publisher_performance FOR EACH ROW EXECUTE FUNCTION public.update_publisher_offerings_updated_at();


--
-- Name: publisher_pricing_rules update_pricing_rules_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pricing_rules_timestamp BEFORE UPDATE ON public.publisher_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_publisher_offerings_updated_at();


--
-- Name: bulk_analysis_domains update_project_stats_on_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_stats_on_delete_trigger AFTER DELETE ON public.bulk_analysis_domains FOR EACH ROW EXECUTE FUNCTION public.update_project_stats_on_delete();


--
-- Name: bulk_analysis_domains update_project_stats_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_stats_trigger AFTER INSERT OR UPDATE ON public.bulk_analysis_domains FOR EACH ROW EXECUTE FUNCTION public.update_project_stats();


--
-- Name: project_websites update_project_websites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_websites_updated_at BEFORE UPDATE ON public.project_websites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: publisher_offerings update_publisher_offerings_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_publisher_offerings_timestamp BEFORE UPDATE ON public.publisher_offerings FOR EACH ROW EXECUTE FUNCTION public.update_publisher_offerings_updated_at();


--
-- Name: publisher_offering_relationships update_publisher_relationships_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_publisher_relationships_timestamp BEFORE UPDATE ON public.publisher_offering_relationships FOR EACH ROW EXECUTE FUNCTION public.update_publisher_offerings_updated_at();


--
-- Name: website_contacts update_website_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_website_contacts_updated_at BEFORE UPDATE ON public.website_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: website_qualifications update_website_qualifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_website_qualifications_updated_at BEFORE UPDATE ON public.website_qualifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: websites update_websites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON public.websites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_order_access advertiser_order_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_order_access
    ADD CONSTRAINT advertiser_order_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: account_order_access advertiser_order_access_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_order_access
    ADD CONSTRAINT advertiser_order_access_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: account_order_access advertiser_order_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_order_access
    ADD CONSTRAINT advertiser_order_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: accounts advertisers_primary_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT advertisers_primary_client_id_fkey FOREIGN KEY (primary_client_id) REFERENCES public.clients(id);


--
-- Name: agent_sessions agent_sessions_workflow_id_workflows_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_sessions
    ADD CONSTRAINT agent_sessions_workflow_id_workflows_id_fk FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: article_sections article_sections_workflow_id_workflows_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.article_sections
    ADD CONSTRAINT article_sections_workflow_id_workflows_id_fk FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: audit_sections audit_sections_audit_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_sections
    ADD CONSTRAINT audit_sections_audit_session_id_fkey FOREIGN KEY (audit_session_id) REFERENCES public.audit_sessions(id) ON DELETE CASCADE;


--
-- Name: audit_sections audit_sections_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_sections
    ADD CONSTRAINT audit_sections_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: audit_sessions audit_sessions_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_sessions
    ADD CONSTRAINT audit_sessions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: benchmark_comparisons benchmark_comparisons_benchmark_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmark_comparisons
    ADD CONSTRAINT benchmark_comparisons_benchmark_id_fkey FOREIGN KEY (benchmark_id) REFERENCES public.order_benchmarks(id) ON DELETE CASCADE;


--
-- Name: benchmark_comparisons benchmark_comparisons_compared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmark_comparisons
    ADD CONSTRAINT benchmark_comparisons_compared_by_fkey FOREIGN KEY (compared_by) REFERENCES public.users(id);


--
-- Name: benchmark_comparisons benchmark_comparisons_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benchmark_comparisons
    ADD CONSTRAINT benchmark_comparisons_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: bulk_analysis_domains bulk_analysis_domains_checked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_checked_by_fkey FOREIGN KEY (checked_by) REFERENCES public.users(id);


--
-- Name: bulk_analysis_domains bulk_analysis_domains_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: bulk_analysis_domains bulk_analysis_domains_duplicate_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_duplicate_of_fkey FOREIGN KEY (duplicate_of) REFERENCES public.bulk_analysis_domains(id);


--
-- Name: bulk_analysis_domains bulk_analysis_domains_duplicate_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_duplicate_resolved_by_fkey FOREIGN KEY (duplicate_resolved_by) REFERENCES public.users(id);


--
-- Name: bulk_analysis_domains bulk_analysis_domains_human_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_human_verified_by_fkey FOREIGN KEY (human_verified_by) REFERENCES public.users(id);


--
-- Name: bulk_analysis_domains bulk_analysis_domains_manually_qualified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_manually_qualified_by_fkey FOREIGN KEY (manually_qualified_by) REFERENCES public.users(id);


--
-- Name: bulk_analysis_domains bulk_analysis_domains_original_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_original_project_id_fkey FOREIGN KEY (original_project_id) REFERENCES public.bulk_analysis_projects(id);


--
-- Name: bulk_analysis_domains bulk_analysis_domains_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_domains
    ADD CONSTRAINT bulk_analysis_domains_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.bulk_analysis_projects(id) ON DELETE SET NULL;


--
-- Name: bulk_analysis_projects bulk_analysis_projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_projects
    ADD CONSTRAINT bulk_analysis_projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: bulk_analysis_projects bulk_analysis_projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_analysis_projects
    ADD CONSTRAINT bulk_analysis_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: bulk_dataforseo_job_items bulk_dataforseo_job_items_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_dataforseo_job_items
    ADD CONSTRAINT bulk_dataforseo_job_items_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.bulk_analysis_domains(id) ON DELETE CASCADE;


--
-- Name: bulk_dataforseo_job_items bulk_dataforseo_job_items_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_dataforseo_job_items
    ADD CONSTRAINT bulk_dataforseo_job_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.bulk_dataforseo_jobs(id) ON DELETE CASCADE;


--
-- Name: bulk_dataforseo_jobs bulk_dataforseo_jobs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_dataforseo_jobs
    ADD CONSTRAINT bulk_dataforseo_jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: bulk_dataforseo_jobs bulk_dataforseo_jobs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_dataforseo_jobs
    ADD CONSTRAINT bulk_dataforseo_jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: client_assignments client_assignments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_assignments
    ADD CONSTRAINT client_assignments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_assignments client_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_assignments
    ADD CONSTRAINT client_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: clients clients_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: clients clients_archived_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.users(id);


--
-- Name: clients clients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: clients clients_invitation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES public.invitations(id) ON DELETE SET NULL;


--
-- Name: commission_configurations commission_configurations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_configurations
    ADD CONSTRAINT commission_configurations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: dataforseo_api_logs dataforseo_api_logs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataforseo_api_logs
    ADD CONSTRAINT dataforseo_api_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- Name: dataforseo_api_logs dataforseo_api_logs_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataforseo_api_logs
    ADD CONSTRAINT dataforseo_api_logs_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.bulk_analysis_domains(id) ON DELETE SET NULL;


--
-- Name: dataforseo_api_logs dataforseo_api_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dataforseo_api_logs
    ADD CONSTRAINT dataforseo_api_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: email_logs email_logs_sent_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_sent_by_fkey FOREIGN KEY (sent_by) REFERENCES public.users(id);


--
-- Name: email_processing_logs email_processing_logs_original_outreach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_processing_logs
    ADD CONSTRAINT email_processing_logs_original_outreach_id_fkey FOREIGN KEY (original_outreach_id) REFERENCES public.email_processing_logs(id);


--
-- Name: email_review_queue email_review_queue_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_review_queue
    ADD CONSTRAINT email_review_queue_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: email_review_queue email_review_queue_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_review_queue
    ADD CONSTRAINT email_review_queue_log_id_fkey FOREIGN KEY (log_id) REFERENCES public.email_processing_logs(id) ON DELETE CASCADE;


--
-- Name: email_review_queue email_review_queue_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_review_queue
    ADD CONSTRAINT email_review_queue_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE SET NULL;


--
-- Name: email_review_queue email_review_queue_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_review_queue
    ADD CONSTRAINT email_review_queue_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: guest_post_items fk_order_items_group; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_post_items
    ADD CONSTRAINT fk_order_items_group FOREIGN KEY (order_group_id) REFERENCES public.order_groups(id);


--
-- Name: guest_post_items fk_order_items_selection; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_post_items
    ADD CONSTRAINT fk_order_items_selection FOREIGN KEY (site_selection_id) REFERENCES public.order_site_selections(id);


--
-- Name: publisher_payouts fk_payouts_publisher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payouts
    ADD CONSTRAINT fk_payouts_publisher FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_performance fk_performance_publisher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_performance
    ADD CONSTRAINT fk_performance_publisher FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_performance fk_performance_website; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_performance
    ADD CONSTRAINT fk_performance_website FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE SET NULL;


--
-- Name: publisher_pricing_rules fk_pricing_rules_offering; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_pricing_rules
    ADD CONSTRAINT fk_pricing_rules_offering FOREIGN KEY (publisher_offering_id) REFERENCES public.publisher_offerings(id) ON DELETE CASCADE;


--
-- Name: publisher_offerings fk_publisher_offerings_publisher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_offerings
    ADD CONSTRAINT fk_publisher_offerings_publisher FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_offering_relationships fk_relationships_offering; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_offering_relationships
    ADD CONSTRAINT fk_relationships_offering FOREIGN KEY (offering_id) REFERENCES public.publisher_offerings(id) ON DELETE CASCADE;


--
-- Name: publisher_offering_relationships fk_relationships_publisher; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_offering_relationships
    ADD CONSTRAINT fk_relationships_publisher FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_offering_relationships fk_relationships_verified_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_offering_relationships
    ADD CONSTRAINT fk_relationships_verified_by FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: publisher_offering_relationships fk_relationships_website; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_offering_relationships
    ADD CONSTRAINT fk_relationships_website FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE CASCADE;


--
-- Name: formatting_qa_checks formatting_qa_checks_qa_session_id_formatting_qa_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formatting_qa_checks
    ADD CONSTRAINT formatting_qa_checks_qa_session_id_formatting_qa_sessions_id_fk FOREIGN KEY (qa_session_id) REFERENCES public.formatting_qa_sessions(id) ON DELETE CASCADE;


--
-- Name: formatting_qa_checks formatting_qa_checks_workflow_id_workflows_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formatting_qa_checks
    ADD CONSTRAINT formatting_qa_checks_workflow_id_workflows_id_fk FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: formatting_qa_sessions formatting_qa_sessions_workflow_id_workflows_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.formatting_qa_sessions
    ADD CONSTRAINT formatting_qa_sessions_workflow_id_workflows_id_fk FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: invoices invoices_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: keyword_analysis_batches keyword_analysis_batches_bulk_analysis_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_analysis_batches
    ADD CONSTRAINT keyword_analysis_batches_bulk_analysis_domain_id_fkey FOREIGN KEY (bulk_analysis_domain_id) REFERENCES public.bulk_analysis_domains(id) ON DELETE CASCADE;


--
-- Name: keyword_analysis_results keyword_analysis_results_bulk_analysis_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_analysis_results
    ADD CONSTRAINT keyword_analysis_results_bulk_analysis_domain_id_fkey FOREIGN KEY (bulk_analysis_domain_id) REFERENCES public.bulk_analysis_domains(id) ON DELETE CASCADE;


--
-- Name: keyword_search_history keyword_search_history_bulk_analysis_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.keyword_search_history
    ADD CONSTRAINT keyword_search_history_bulk_analysis_domain_id_fkey FOREIGN KEY (bulk_analysis_domain_id) REFERENCES public.bulk_analysis_domains(id) ON DELETE CASCADE;


--
-- Name: line_item_changes line_item_changes_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_item_changes
    ADD CONSTRAINT line_item_changes_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: line_item_changes line_item_changes_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_item_changes
    ADD CONSTRAINT line_item_changes_line_item_id_fkey FOREIGN KEY (line_item_id) REFERENCES public.order_line_items(id) ON DELETE CASCADE;


--
-- Name: line_item_templates line_item_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.line_item_templates
    ADD CONSTRAINT line_item_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: link_orchestration_sessions link_orchestration_sessions_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.link_orchestration_sessions
    ADD CONSTRAINT link_orchestration_sessions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


--
-- Name: linkio_assets linkio_assets_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_assets
    ADD CONSTRAINT linkio_assets_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.linkio_pages(id);


--
-- Name: linkio_components linkio_components_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linkio_components
    ADD CONSTRAINT linkio_components_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.linkio_pages(id);


--
-- Name: master_qualification_job_items master_qualification_job_items_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_qualification_job_items
    ADD CONSTRAINT master_qualification_job_items_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.bulk_analysis_domains(id) ON DELETE CASCADE;


--
-- Name: master_qualification_job_items master_qualification_job_items_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_qualification_job_items
    ADD CONSTRAINT master_qualification_job_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.master_qualification_jobs(id) ON DELETE CASCADE;


--
-- Name: master_qualification_jobs master_qualification_jobs_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_qualification_jobs
    ADD CONSTRAINT master_qualification_jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: order_benchmarks order_benchmarks_captured_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_benchmarks
    ADD CONSTRAINT order_benchmarks_captured_by_fkey FOREIGN KEY (captured_by) REFERENCES public.users(id);


--
-- Name: order_benchmarks order_benchmarks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_benchmarks
    ADD CONSTRAINT order_benchmarks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: order_benchmarks order_benchmarks_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_benchmarks
    ADD CONSTRAINT order_benchmarks_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_groups order_groups_bulk_analysis_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_bulk_analysis_project_id_fkey FOREIGN KEY (bulk_analysis_project_id) REFERENCES public.bulk_analysis_projects(id);


--
-- Name: order_groups order_groups_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: order_groups order_groups_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_groups
    ADD CONSTRAINT order_groups_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: guest_post_items order_items_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_post_items
    ADD CONSTRAINT order_items_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.bulk_analysis_domains(id);


--
-- Name: guest_post_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_post_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: guest_post_items order_items_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guest_post_items
    ADD CONSTRAINT order_items_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id);


--
-- Name: order_line_items order_line_items_added_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_added_by_user_id_fkey FOREIGN KEY (added_by_user_id) REFERENCES public.users(id);


--
-- Name: order_line_items order_line_items_approved_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id);


--
-- Name: order_line_items order_line_items_assigned_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_assigned_domain_id_fkey FOREIGN KEY (assigned_domain_id) REFERENCES public.bulk_analysis_domains(id);


--
-- Name: order_line_items order_line_items_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: order_line_items order_line_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_line_items order_line_items_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE SET NULL;


--
-- Name: order_line_items order_line_items_publisher_offering_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_publisher_offering_id_fkey FOREIGN KEY (publisher_offering_id) REFERENCES public.publisher_offerings(id) ON DELETE SET NULL;


--
-- Name: order_line_items order_line_items_target_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_line_items
    ADD CONSTRAINT order_line_items_target_page_id_fkey FOREIGN KEY (target_page_id) REFERENCES public.target_pages(id);


--
-- Name: order_share_tokens order_share_tokens_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_share_tokens
    ADD CONSTRAINT order_share_tokens_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_site_selections order_site_selections_domain_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_selections
    ADD CONSTRAINT order_site_selections_domain_id_fkey FOREIGN KEY (domain_id) REFERENCES public.bulk_analysis_domains(id);


--
-- Name: order_site_selections order_site_selections_guest_post_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_selections
    ADD CONSTRAINT order_site_selections_guest_post_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.guest_post_items(id);


--
-- Name: order_site_selections order_site_selections_order_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_selections
    ADD CONSTRAINT order_site_selections_order_group_id_fkey FOREIGN KEY (order_group_id) REFERENCES public.order_groups(id) ON DELETE CASCADE;


--
-- Name: order_site_selections order_site_selections_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_selections
    ADD CONSTRAINT order_site_selections_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: order_site_submissions order_site_submissions_client_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_submissions
    ADD CONSTRAINT order_site_submissions_client_reviewed_by_fkey FOREIGN KEY (client_reviewed_by) REFERENCES public.users(id);


--
-- Name: order_site_submissions order_site_submissions_order_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_submissions
    ADD CONSTRAINT order_site_submissions_order_group_id_fkey FOREIGN KEY (order_group_id) REFERENCES public.order_groups(id) ON DELETE CASCADE;


--
-- Name: order_site_submissions order_site_submissions_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_site_submissions
    ADD CONSTRAINT order_site_submissions_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- Name: orders orders_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: orders orders_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: orders orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: outline_sessions outline_sessions_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outline_sessions
    ADD CONSTRAINT outline_sessions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: payments payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: polish_sections polish_sections_polish_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polish_sections
    ADD CONSTRAINT polish_sections_polish_session_id_fkey FOREIGN KEY (polish_session_id) REFERENCES public.polish_sessions(id) ON DELETE CASCADE;


--
-- Name: polish_sections polish_sections_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polish_sections
    ADD CONSTRAINT polish_sections_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: polish_sessions polish_sessions_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.polish_sessions
    ADD CONSTRAINT polish_sessions_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: project_order_associations project_order_associations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_order_associations
    ADD CONSTRAINT project_order_associations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: project_order_associations project_order_associations_order_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_order_associations
    ADD CONSTRAINT project_order_associations_order_group_id_fkey FOREIGN KEY (order_group_id) REFERENCES public.order_groups(id) ON DELETE CASCADE;


--
-- Name: project_order_associations project_order_associations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_order_associations
    ADD CONSTRAINT project_order_associations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: project_order_associations project_order_associations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_order_associations
    ADD CONSTRAINT project_order_associations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.bulk_analysis_projects(id) ON DELETE CASCADE;


--
-- Name: project_websites project_websites_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_websites
    ADD CONSTRAINT project_websites_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id);


--
-- Name: project_websites project_websites_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_websites
    ADD CONSTRAINT project_websites_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.bulk_analysis_projects(id) ON DELETE CASCADE;


--
-- Name: project_websites project_websites_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_websites
    ADD CONSTRAINT project_websites_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE CASCADE;


--
-- Name: publisher_automation_logs publisher_automation_logs_email_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_automation_logs
    ADD CONSTRAINT publisher_automation_logs_email_log_id_fkey FOREIGN KEY (email_log_id) REFERENCES public.email_processing_logs(id);


--
-- Name: publisher_automation_logs publisher_automation_logs_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_automation_logs
    ADD CONSTRAINT publisher_automation_logs_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id);


--
-- Name: publisher_earnings publisher_earnings_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_earnings
    ADD CONSTRAINT publisher_earnings_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: publisher_earnings publisher_earnings_order_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_earnings
    ADD CONSTRAINT publisher_earnings_order_line_item_id_fkey FOREIGN KEY (order_line_item_id) REFERENCES public.order_line_items(id) ON DELETE SET NULL;


--
-- Name: publisher_earnings publisher_earnings_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_earnings
    ADD CONSTRAINT publisher_earnings_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_earnings publisher_earnings_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_earnings
    ADD CONSTRAINT publisher_earnings_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id);


--
-- Name: publisher_email_claims publisher_email_claims_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_email_claims
    ADD CONSTRAINT publisher_email_claims_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_email_claims publisher_email_claims_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_email_claims
    ADD CONSTRAINT publisher_email_claims_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE CASCADE;


--
-- Name: publisher_invoices publisher_invoices_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_invoices
    ADD CONSTRAINT publisher_invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: publisher_invoices publisher_invoices_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_invoices
    ADD CONSTRAINT publisher_invoices_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.users(id);


--
-- Name: publisher_invoices publisher_invoices_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_invoices
    ADD CONSTRAINT publisher_invoices_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_invoices publisher_invoices_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_invoices
    ADD CONSTRAINT publisher_invoices_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- Name: publisher_order_analytics publisher_order_analytics_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_order_analytics
    ADD CONSTRAINT publisher_order_analytics_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_order_analytics publisher_order_analytics_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_order_analytics
    ADD CONSTRAINT publisher_order_analytics_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id);


--
-- Name: publisher_order_notifications publisher_order_notifications_order_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_order_notifications
    ADD CONSTRAINT publisher_order_notifications_order_line_item_id_fkey FOREIGN KEY (order_line_item_id) REFERENCES public.order_line_items(id) ON DELETE CASCADE;


--
-- Name: publisher_order_notifications publisher_order_notifications_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_order_notifications
    ADD CONSTRAINT publisher_order_notifications_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_payment_batches publisher_payment_batches_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payment_batches
    ADD CONSTRAINT publisher_payment_batches_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: publisher_payment_batches publisher_payment_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payment_batches
    ADD CONSTRAINT publisher_payment_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: publisher_payment_batches publisher_payment_batches_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payment_batches
    ADD CONSTRAINT publisher_payment_batches_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id);


--
-- Name: publisher_payment_profiles publisher_payment_profiles_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payment_profiles
    ADD CONSTRAINT publisher_payment_profiles_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: publisher_payment_profiles publisher_payment_profiles_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_payment_profiles
    ADD CONSTRAINT publisher_payment_profiles_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: publisher_websites publisher_websites_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publisher_websites
    ADD CONSTRAINT publisher_websites_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE CASCADE;


--
-- Name: refunds refunds_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id);


--
-- Name: refunds refunds_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: refunds refunds_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: shadow_publisher_websites shadow_publisher_websites_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_publisher_websites
    ADD CONSTRAINT shadow_publisher_websites_publisher_id_fkey FOREIGN KEY (publisher_id) REFERENCES public.publishers(id);


--
-- Name: shadow_publisher_websites shadow_publisher_websites_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_publisher_websites
    ADD CONSTRAINT shadow_publisher_websites_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id);


--
-- Name: shadow_publisher_websites shadow_publisher_websites_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shadow_publisher_websites
    ADD CONSTRAINT shadow_publisher_websites_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id);


--
-- Name: stripe_customers stripe_customers_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_customers
    ADD CONSTRAINT stripe_customers_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: stripe_payment_intents stripe_payment_intents_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_intents
    ADD CONSTRAINT stripe_payment_intents_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: stripe_payment_intents stripe_payment_intents_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_payment_intents
    ADD CONSTRAINT stripe_payment_intents_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id);


--
-- Name: stripe_webhooks stripe_webhooks_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhooks
    ADD CONSTRAINT stripe_webhooks_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: stripe_webhooks stripe_webhooks_payment_intent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_webhooks
    ADD CONSTRAINT stripe_webhooks_payment_intent_id_fkey FOREIGN KEY (payment_intent_id) REFERENCES public.stripe_payment_intents(id);


--
-- Name: target_pages target_pages_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_pages
    ADD CONSTRAINT target_pages_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: user_client_access user_client_access_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: user_client_access user_client_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: user_client_access user_client_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_client_access
    ADD CONSTRAINT user_client_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_website_access user_website_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_website_access
    ADD CONSTRAINT user_website_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: user_website_access user_website_access_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_website_access
    ADD CONSTRAINT user_website_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_website_access user_website_access_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_website_access
    ADD CONSTRAINT user_website_access_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE CASCADE;


--
-- Name: website_contacts website_contacts_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_contacts
    ADD CONSTRAINT website_contacts_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE CASCADE;


--
-- Name: website_qualifications website_qualifications_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_qualifications
    ADD CONSTRAINT website_qualifications_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: website_qualifications website_qualifications_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_qualifications
    ADD CONSTRAINT website_qualifications_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.bulk_analysis_projects(id) ON DELETE SET NULL;


--
-- Name: website_qualifications website_qualifications_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_qualifications
    ADD CONSTRAINT website_qualifications_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE CASCADE;


--
-- Name: website_sync_logs website_sync_logs_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.website_sync_logs
    ADD CONSTRAINT website_sync_logs_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE CASCADE;


--
-- Name: websites websites_added_by_publisher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.websites
    ADD CONSTRAINT websites_added_by_publisher_id_fkey FOREIGN KEY (added_by_publisher_id) REFERENCES public.publishers(id);


--
-- Name: websites websites_added_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.websites
    ADD CONSTRAINT websites_added_by_user_id_fkey FOREIGN KEY (added_by_user_id) REFERENCES public.users(id);


--
-- Name: workflow_steps workflow_steps_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflow_websites workflow_websites_website_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_websites
    ADD CONSTRAINT workflow_websites_website_id_fkey FOREIGN KEY (website_id) REFERENCES public.websites(id) ON DELETE CASCADE;


--
-- Name: workflow_websites workflow_websites_workflow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_websites
    ADD CONSTRAINT workflow_websites_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

