import React from 'react';
import { WpPostContext } from '../context';
import type { WpPost } from '../types';

export interface WpQueryLoopProps {
  /** Post type key — matches a key in your cms/mock-data.json */
  postType?: string;
  /** Number of posts to render */
  postsPerPage?: number;
  /** Optional category slug filter */
  categoryName?: string;
  /** Optional WordPress query order field */
  orderby?: string;
  /** Optional WordPress query order direction */
  order?: 'ASC' | 'DESC';
  /** Optional ID filter for single views */
  postId?: number;
  /** Optional relational custom-field meta query key */
  metaKey?: string;
  /** Optional relational custom-field meta query value */
  metaValue?: string;
  /** Optional relational custom-field meta query comparison operator */
  metaCompare?: string;
  /** Optional relational custom taxonomy */
  taxTaxonomy?: string;
  /** Optional relational custom taxonomy term slugs */
  taxTerms?: string;
  /** Optional relational dynamic post ID collection selector */
  postIn?: string;
  /**
   * Posts data — injected by ForgeWP's Vite runtime data bridge.
   * You do not need to pass this yourself; WpQueryLoop in your project handles it.
   */
  posts?: WpPost[];
  children: React.ReactNode;
}

/**
 * WpQueryLoop — Iterates over an array of WpPost objects and provides
 * each post to child hooks via WpPostContext.
 *
 * This component is framework-level infrastructure — it contains no
 * styling, no layout opinions, and no rendering assumptions.
 *
 * The ForgeWP compiler transforms this to a standard WordPress loop:
 *   while (have_posts()) { the_post(); ... }
 */
export function WpQueryLoop({
  postType = 'post',
  postsPerPage = 3,
  categoryName = '',
  orderby = '',
  order = 'DESC',
  postId,
  metaKey = '',
  metaValue = '',
  metaCompare = '=',
  taxTaxonomy = '',
  taxTerms = '',
  postIn,
  posts: postsProp,
  children,
}: WpQueryLoopProps) {
  const isCompileTime =
    typeof window !== 'undefined' &&
    (window as any)._forgeWpCompileTime === true;

  if (isCompileTime) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement('forgewp-query-loop-start', {
        postType,
        postsPerPage,
        categoryName,
        postId,
        metaKey,
        metaValue,
        metaCompare,
        taxTaxonomy,
        taxTerms,
        postIn,
      }),
      children,
      React.createElement('forgewp-query-loop-end'),
    );
  }

  const posts =
    postsProp ??
    (typeof window !== 'undefined'
      ? ((window as any)._forgeWpMockPosts?.[postType] as WpPost[] | undefined)
      : undefined) ??
    [];
  const parentPost = React.useContext(WpPostContext);

  // Filter by postIn if provided (for local listicle connected post views)
  let filteredPosts = posts;
  if (postIn && parentPost?.customFields?.[postIn]) {
    const relatedVal = String(parentPost.customFields[postIn]);
    const ids = relatedVal.split(',').filter(Boolean).map(Number);
    filteredPosts = posts.filter((p) => ids.includes(p.id));

    // Sort in the order of the ids
    filteredPosts.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  }

  if (metaKey) {
    filteredPosts = filteredPosts.filter((post) => {
      const hasValue =
        post.customFields &&
        Object.prototype.hasOwnProperty.call(post.customFields, metaKey);
      if (metaCompare === 'EXISTS') return Boolean(hasValue);
      if (metaCompare === 'NOT EXISTS') return !hasValue;
      if (!hasValue) return false;

      const actual = String(post.customFields?.[metaKey] ?? '');
      const expected = String(metaValue);
      switch (metaCompare) {
        case '!=':
          return actual !== expected;
        case 'LIKE':
          return actual.includes(expected);
        case '>':
          return Number(actual) > Number(expected);
        case '>=':
          return Number(actual) >= Number(expected);
        case '<':
          return Number(actual) < Number(expected);
        case '<=':
          return Number(actual) <= Number(expected);
        default:
          return actual === expected;
      }
    });
  }

  if (taxTaxonomy) {
    const terms = taxTerms
      .split(',')
      .map((term) => term.trim())
      .filter(Boolean);
    filteredPosts = filteredPosts.filter((post) =>
      (post as any)._terms?.[taxTaxonomy]?.some((term: any) =>
        terms.includes(String(term.slug ?? term.name ?? term)),
      ),
    );
  }

  if (categoryName) {
    filteredPosts = filteredPosts.filter((post) =>
      (post as any)._terms?.category?.some(
        (term: any) => term.slug === categoryName || term.name === categoryName,
      ),
    );
  }

  if (orderby) {
    filteredPosts = [...filteredPosts].sort((left, right) => {
      const leftValue =
        orderby === 'title'
          ? left.title
          : orderby === 'modified'
            ? left.modified || left.date
            : left.date;
      const rightValue =
        orderby === 'title'
          ? right.title
          : orderby === 'modified'
            ? right.modified || right.date
            : right.date;
      const comparison =
        orderby === 'title'
          ? String(leftValue).localeCompare(String(rightValue))
          : new Date(leftValue).getTime() - new Date(rightValue).getTime();
      return order === 'ASC' ? comparison : -comparison;
    });
  }

  // Filter by ID if requested (for local single views), then slice and inject __postType
  if (postId) {
    filteredPosts = filteredPosts.filter((p) => p.id === postId);
  }

  const items = filteredPosts
    .slice(0, postsPerPage)
    .map((p) => ({ ...p, __postType: postType }));

  if (items.length === 0) {
    // Fallback placeholders so the layout is always visible during dev
    const fallbacks: WpPost[] = Array.from(
      { length: postsPerPage },
      (_, i) => ({
        id: i + 1,
        title: `Mock ${postType} ${i + 1}`,
        excerpt: 'Placeholder excerpt — add entries to cms/mock-data.json.',
        content: '<p>Placeholder content.</p>',
        date: new Date().toLocaleDateString('en-US'),
        author: 'Author',
        featuredImage: `https://picsum.photos/seed/${postType}${i}/1200/630`,
        __postType: postType,
      }),
    );

    return (
      <>
        {fallbacks.map((post) => (
          <WpPostContext.Provider
            key={post.id}
            value={post}
          >
            {children}
          </WpPostContext.Provider>
        ))}
      </>
    );
  }

  return (
    <>
      {items.map((post) => (
        <WpPostContext.Provider
          key={post.id}
          value={post}
        >
          {children}
        </WpPostContext.Provider>
      ))}
    </>
  );
}
