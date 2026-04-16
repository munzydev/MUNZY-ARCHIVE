/**
 * 페이지 인터랙션 초기화 스크립트
 * 1) 헤더 Contact 링크 안내 알림
 * 2) 글로벌 헤더 메뉴 토글/스크롤 노출 제어
 * 3) Hero 라인 리빌 및 하단 콘텐츠 순차 등장
 * 4) Intro 이미지 스크롤 교차 이동
 * 5) 섹션 경계 스크롤 핸드오프(부드러운 구간 전환)
 * 6) Works 모달 열기/닫기 및 접근성 상태 동기화
 */
document.addEventListener('DOMContentLoaded', () => {
    initWayContactAlert();
    initCopyEmail();
    initHeaderMenu();
    initHeroReveal();
    initIntroReveal();
    initExpertiseReveal();
    initWorksHeadingReveal();
    initIntroImageScrollSwap();
    initSectionScrollHandoff();
    initProjectModals();
});

/**
 * Hero 진입 모션을 초기화한다.
 * 1) 타이틀 라인(span) 순차 리빌
 * 2) 하단 비디오/카피 순차 등장
 * 3) 뷰포트 재진입 상태(inview) 동기화
 * 4) prefers-reduced-motion 사용자에게는 모션을 최소화
 */
function initHeroReveal() {
    const heroSection = document.querySelector('#hero');
    const heroTitle = heroSection ? heroSection.querySelector('.hero-title') : null;

    if (!heroSection || !heroTitle) {
        return;
    }

    const heroTitleLines = heroTitle.querySelectorAll(':scope > span');
    const heroBottomItems = heroSection.querySelectorAll('.btm-contents .video-placeholder, .btm-contents .hero-copy');
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const HERO_INTRO_COMPLETE_FALLBACK_MS = 1700;
    const HERO_INVIEW_THRESHOLD = 0.25;
    let introCompleteTimer = null;
    let hasPlayedHeroIntro = false;
    let isHeroInView = false;
    let heroInViewObserver = null;

    const applySequentialIndexVariable = (elements, variableName) => {
        elements.forEach((element, index) => {
            element.style.setProperty(variableName, String(index));
        });
    };

    const applyHeroLineAttributes = (elements) => {
        elements.forEach((lineElement, index) => {
            lineElement.setAttribute('data-line', String(index));
            lineElement.setAttribute('data-index', String(index));
            lineElement.style.setProperty('--line-index', String(index));
        });
    };

    const clearIntroCompleteTimer = () => {
        if (introCompleteTimer) {
            clearTimeout(introCompleteTimer);
            introCompleteTimer = null;
        }
    };

    const clearHeroRevealClasses = () => {
        clearIntroCompleteTimer();
        heroSection.classList.remove('is-hero-reveal-ready', 'is-hero-reveal-active', 'is-hero-intro-complete');
    };

    const applyHeroSettledState = (preserveInView = true) => {
        clearHeroRevealClasses();

        if (preserveInView) {
            heroSection.classList.add('is-hero-inview');
        } else {
            heroSection.classList.remove('is-hero-inview');
        }

        heroSection.classList.add('is-hero-reveal-ready', 'is-hero-reveal-active', 'is-hero-intro-complete');
    };

    const runHeroRevealMotion = () => {
        clearHeroRevealClasses();
        heroSection.classList.add('is-hero-inview');

        // 클래스 재적용 시 transition이 확실히 재시작되도록 레이아웃을 한 번 고정한다.
        void heroSection.offsetWidth;

        heroSection.classList.add('is-hero-reveal-ready');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                heroSection.classList.add('is-hero-reveal-active');
            });
        });

        clearIntroCompleteTimer();
        introCompleteTimer = window.setTimeout(() => {
            heroSection.classList.add('is-hero-intro-complete');
        }, HERO_INTRO_COMPLETE_FALLBACK_MS);
    };

    const playHeroRevealOnce = () => {
        if (hasPlayedHeroIntro) {
            return;
        }

        hasPlayedHeroIntro = true;
        runHeroRevealMotion();
    };

    const applyReducedMotionState = (preserveInView = true) => {
        hasPlayedHeroIntro = true;
        applyHeroSettledState(preserveInView);
    };

    const syncHeroInViewState = (nextInView) => {
        isHeroInView = nextInView;
        heroSection.classList.toggle('is-hero-inview', isHeroInView);

        if (!isHeroInView) {
            return;
        }

        if (reducedMotionMediaQuery.matches) {
            applyReducedMotionState(true);
            return;
        }

        playHeroRevealOnce();
    };

    const getIsHeroInViewport = () => {
        const heroRect = heroSection.getBoundingClientRect();
        return heroRect.bottom > 0 && heroRect.top < window.innerHeight;
    };

    const handleReducedMotionChange = () => {
        if (reducedMotionMediaQuery.matches) {
            applyReducedMotionState(isHeroInView);
            return;
        }

        if (hasPlayedHeroIntro) {
            applyHeroSettledState(isHeroInView);
            return;
        }

        if (isHeroInView) {
            playHeroRevealOnce();
        }
    };

    const handlePageShow = (event) => {
        if (!event.persisted) {
            return;
        }

        const shouldPreserveInView = isHeroInView || getIsHeroInViewport();

        if (reducedMotionMediaQuery.matches) {
            applyReducedMotionState(shouldPreserveInView);
            return;
        }

        if (hasPlayedHeroIntro) {
            applyHeroSettledState(shouldPreserveInView);
            return;
        }

        if (shouldPreserveInView) {
            playHeroRevealOnce();
        }
    };

    if (!heroTitleLines.length && !heroBottomItems.length) {
        heroSection.classList.add('is-hero-inview');
        return;
    }

    heroTitle.setAttribute('data-hero-split', 'true');
    heroTitle.setAttribute('data-hero-heading', '');
    applyHeroLineAttributes(heroTitleLines);
    applySequentialIndexVariable(heroBottomItems, '--hero-content-index');

    syncHeroInViewState(getIsHeroInViewport());

    if (typeof IntersectionObserver === 'function') {
        /**
         * Hero는 실제 화면에 들어왔을 때만 1회 강한 리빌을 재생한다.
         * 이후에는 in-view 상태만 동기화해 재진입 시 미세 페이드만 적용한다.
         */
        heroInViewObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                syncHeroInViewState(entry.isIntersecting);
            });
        }, {
            root: null,
            threshold: HERO_INVIEW_THRESHOLD,
        });

        heroInViewObserver.observe(heroSection);
    } else if (!reducedMotionMediaQuery.matches) {
        // 구형 브라우저 폴백: observer 미지원 시 초기 진입에서만 1회 재생한다.
        playHeroRevealOnce();
    }

    if (reducedMotionMediaQuery.matches) {
        applyReducedMotionState(isHeroInView);
    }

    window.addEventListener('pageshow', handlePageShow);

    if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
        reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
    } else if (typeof reducedMotionMediaQuery.addListener === 'function') {
        reducedMotionMediaQuery.addListener(handleReducedMotionChange);
    }

    window.addEventListener('beforeunload', () => {
        clearIntroCompleteTimer();
        window.removeEventListener('pageshow', handlePageShow);

        if (heroInViewObserver) {
            heroInViewObserver.disconnect();
        }

        if (typeof reducedMotionMediaQuery.removeEventListener === 'function') {
            reducedMotionMediaQuery.removeEventListener('change', handleReducedMotionChange);
        } else if (typeof reducedMotionMediaQuery.removeListener === 'function') {
            reducedMotionMediaQuery.removeListener(handleReducedMotionChange);
        }
    });
}

/**
 * Intro 진입 모션을 초기화한다.
 * 1) 타이틀 라인(span) 순차 리빌
 * 2) 좌우 이미지 교차 진입(아래->위 / 위->아래)
 * 3) 하단 카피 후행 등장
 * 4) prefers-reduced-motion 사용자에게는 모션을 최소화
 */
function initIntroReveal() {
    const introSection = document.querySelector('#intro');
    const introTitle = introSection ? introSection.querySelector('#intro-title') : null;

    if (!introSection || !introTitle) {
        return;
    }

    const introTitleLines = introTitle.querySelectorAll(':scope > span');
    const introImages = introSection.querySelectorAll('.placeholder-wrap .img-placeholder');
    const introCopy = introSection.querySelector('.intro-copy');
    const introCopyLines = introCopy ? introCopy.querySelectorAll(':scope > p') : [];
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const INTRO_REVEAL_COMPLETE_FALLBACK_MS = 1800;
    const INTRO_INVIEW_THRESHOLD = 0;
    const INTRO_PREHIDDEN_CLASS = 'is-intro-prehidden';
    let introRevealCompleteTimer = null;
    let hasPlayedIntroReveal = false;
    let isIntroInView = false;
    let introInViewObserver = null;

    const applySequentialIndexVariable = (elements, variableName) => {
        elements.forEach((element, index) => {
            element.style.setProperty(variableName, String(index));
        });
    };

    const applyIntroLineAttributes = (elements) => {
        elements.forEach((lineElement, index) => {
            lineElement.setAttribute('data-line', String(index));
            lineElement.setAttribute('data-index', String(index));
            lineElement.style.setProperty('--intro-line-index', String(index));
        });
    };

    const clearIntroRevealCompleteTimer = () => {
        if (introRevealCompleteTimer) {
            clearTimeout(introRevealCompleteTimer);
            introRevealCompleteTimer = null;
        }
    };

    const clearIntroRevealClasses = () => {
        clearIntroRevealCompleteTimer();
        introSection.classList.remove('is-intro-reveal-ready', 'is-intro-reveal-active', 'is-intro-reveal-complete');
    };

    const ensureIntroPrehiddenState = () => {
        if (hasPlayedIntroReveal || reducedMotionMediaQuery.matches) {
            return;
        }

        introSection.classList.add(INTRO_PREHIDDEN_CLASS);
    };

    const applyIntroSettledState = (preserveInView = true) => {
        clearIntroRevealClasses();
        introSection.classList.remove(INTRO_PREHIDDEN_CLASS);

        if (preserveInView) {
            introSection.classList.add('is-intro-inview');
        } else {
            introSection.classList.remove('is-intro-inview');
        }

        introSection.classList.add('is-intro-reveal-ready', 'is-intro-reveal-active', 'is-intro-reveal-complete');
    };

    const runIntroRevealMotion = () => {
        clearIntroRevealClasses();
        ensureIntroPrehiddenState();
        introSection.classList.add('is-intro-inview');

        // 상태 클래스를 재적용할 때 transition이 재시작되도록 reflow를 고정한다.
        void introSection.offsetWidth;

        introSection.classList.add('is-intro-reveal-ready');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                introSection.classList.add('is-intro-reveal-active');
                introSection.classList.remove(INTRO_PREHIDDEN_CLASS);
            });
        });

        clearIntroRevealCompleteTimer();
        introRevealCompleteTimer = window.setTimeout(() => {
            introSection.classList.add('is-intro-reveal-complete');
        }, INTRO_REVEAL_COMPLETE_FALLBACK_MS);
    };

    const playIntroRevealOnce = () => {
        if (hasPlayedIntroReveal) {
            return;
        }

        hasPlayedIntroReveal = true;
        runIntroRevealMotion();
    };

    const applyReducedMotionState = (preserveInView = true) => {
        hasPlayedIntroReveal = true;
        applyIntroSettledState(preserveInView);
    };

    const syncIntroInViewState = (nextInView) => {
        isIntroInView = nextInView;
        introSection.classList.toggle('is-intro-inview', isIntroInView);

        if (!isIntroInView) {
            ensureIntroPrehiddenState();
            return;
        }

        if (reducedMotionMediaQuery.matches) {
            applyReducedMotionState(true);
            return;
        }

        playIntroRevealOnce();
    };

    const getIsIntroInViewport = () => {
        const introRect = introSection.getBoundingClientRect();
        return introRect.bottom > 0 && introRect.top < window.innerHeight;
    };

    const handleReducedMotionChange = () => {
        if (reducedMotionMediaQuery.matches) {
            applyReducedMotionState(isIntroInView);
            return;
        }

        if (hasPlayedIntroReveal) {
            applyIntroSettledState(isIntroInView);
            return;
        }

        ensureIntroPrehiddenState();

        if (isIntroInView) {
            playIntroRevealOnce();
        }
    };

    const handlePageShow = (event) => {
        if (!event.persisted) {
            return;
        }

        const shouldPreserveInView = isIntroInView || getIsIntroInViewport();

        if (reducedMotionMediaQuery.matches) {
            applyReducedMotionState(shouldPreserveInView);
            return;
        }

        if (hasPlayedIntroReveal) {
            applyIntroSettledState(shouldPreserveInView);
            return;
        }

        if (shouldPreserveInView) {
            playIntroRevealOnce();
            return;
        }

        ensureIntroPrehiddenState();
    };

    if (!introTitleLines.length && !introImages.length && !introCopyLines.length) {
        introSection.classList.add('is-intro-inview');
        return;
    }

    introTitle.setAttribute('data-intro-split', 'true');
    introTitle.setAttribute('data-intro-heading', '');
    applyIntroLineAttributes(introTitleLines);
    applySequentialIndexVariable(introImages, '--intro-image-index');
    applySequentialIndexVariable(introCopyLines, '--intro-copy-index');

    ensureIntroPrehiddenState();
    syncIntroInViewState(getIsIntroInViewport());

    if (typeof IntersectionObserver === 'function') {
        /**
         * Intro는 실제 화면 진입 시 1회 강한 리빌을 실행하고,
         * 이후에는 in-view 상태만 동기화해 과도한 반복 연출을 피한다.
         */
        introInViewObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                syncIntroInViewState(entry.isIntersecting);
            });
        }, {
            root: null,
            threshold: INTRO_INVIEW_THRESHOLD,
        });

        introInViewObserver.observe(introSection);
    } else if (!reducedMotionMediaQuery.matches) {
        // 구형 브라우저 폴백: observer 미지원 시 최초 진입에서 1회 재생한다.
        playIntroRevealOnce();
    }

    if (reducedMotionMediaQuery.matches) {
        applyReducedMotionState(isIntroInView);
    }

    window.addEventListener('pageshow', handlePageShow);

    if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
        reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
    } else if (typeof reducedMotionMediaQuery.addListener === 'function') {
        reducedMotionMediaQuery.addListener(handleReducedMotionChange);
    }

    window.addEventListener('beforeunload', () => {
        clearIntroRevealCompleteTimer();
        window.removeEventListener('pageshow', handlePageShow);

        if (introInViewObserver) {
            introInViewObserver.disconnect();
        }

        if (typeof reducedMotionMediaQuery.removeEventListener === 'function') {
            reducedMotionMediaQuery.removeEventListener('change', handleReducedMotionChange);
        } else if (typeof reducedMotionMediaQuery.removeListener === 'function') {
            reducedMotionMediaQuery.removeListener(handleReducedMotionChange);
        }
    });
}

/**
 * Expertise 진입 모션을 초기화한다.
 * 1) 타이틀을 줄 단위로 분리해 순차 reveal
 * 2) 카드별 sub-title/title/des를 순차 reveal
 * 3) prefers-reduced-motion 환경에서는 모션 없이 즉시 표시
 */
function initExpertiseReveal() {
    const expertiseSection = document.querySelector('#expertise');
    const expertiseTitleWrap = expertiseSection ? expertiseSection.querySelector(':scope > .title-wrap') : null;
    const expertiseTitle = expertiseSection ? expertiseSection.querySelector(':scope > .title-wrap .title-txt-type') : null;
    const expertiseItems = expertiseSection
        ? Array.from(expertiseSection.querySelectorAll(':scope > .contents-wrap .contents'))
        : [];

    if (!expertiseSection || !expertiseTitle) {
        return;
    }

    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const EXPERTISE_SECTION_THRESHOLD = 0.12;
    const EXPERTISE_TITLE_ZONE_TOP_RATIO_DESKTOP = 0.79;
    const EXPERTISE_TITLE_ZONE_BOTTOM_RATIO_DESKTOP = 0.85;
    const EXPERTISE_TITLE_ZONE_TOP_RATIO_TABLET = 0.78;
    const EXPERTISE_TITLE_ZONE_BOTTOM_RATIO_TABLET = 0.86;
    const EXPERTISE_TITLE_ZONE_TOP_RATIO_MOBILE = 0.76;
    const EXPERTISE_TITLE_ZONE_BOTTOM_RATIO_MOBILE = 0.88;
    const EXPERTISE_ITEM_ZONE_TOP_RATIO_DESKTOP = 0.67;
    const EXPERTISE_ITEM_ZONE_BOTTOM_RATIO_DESKTOP = 0.73;
    const EXPERTISE_ITEM_ZONE_TOP_RATIO_TABLET = 0.66;
    const EXPERTISE_ITEM_ZONE_BOTTOM_RATIO_TABLET = 0.74;
    const EXPERTISE_ITEM_ZONE_TOP_RATIO_MOBILE = 0.64;
    const EXPERTISE_ITEM_ZONE_BOTTOM_RATIO_MOBILE = 0.76;
    let isExpertiseInView = false;
    let hasActivatedExpertiseTitle = false;
    let expertiseSectionObserver = null;
    let titleRevealAnimationFrameId = 0;
    let isTitleRevealEventsBound = false;
    let itemRevealAnimationFrameId = 0;
    let isItemRevealEventsBound = false;
    const pendingExpertiseItems = new Set(expertiseItems);

    const getIsElementInViewport = (element) => {
        const elementRect = element.getBoundingClientRect();
        return elementRect.bottom > 0 && elementRect.top < window.innerHeight;
    };

    const isScrollableOverflowValue = (overflowValue) => /(auto|scroll|overlay)/.test(overflowValue);

    const getTitleRevealEventTargets = () => {
        const targets = [window, document, document.documentElement];
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);
        const bodyScrollEnabled = isScrollableOverflowValue(bodyStyles.overflowY) || isScrollableOverflowValue(bodyStyles.overflow);
        const htmlScrollLocked = /(hidden|clip)/.test(htmlStyles.overflowY) || /(hidden|clip)/.test(htmlStyles.overflow);

        if (bodyScrollEnabled || htmlScrollLocked) {
            targets.push(document.body);
        }

        return Array.from(new Set(targets));
    };

    const titleRevealEventTargets = getTitleRevealEventTargets();
    const itemRevealEventTargets = titleRevealEventTargets;

    const getExpertiseTitleRevealZoneRatio = () => {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;

        if (viewportWidth >= 1280) {
            return {
                top: EXPERTISE_TITLE_ZONE_TOP_RATIO_DESKTOP,
                bottom: EXPERTISE_TITLE_ZONE_BOTTOM_RATIO_DESKTOP,
            };
        }

        if (viewportWidth >= 800) {
            return {
                top: EXPERTISE_TITLE_ZONE_TOP_RATIO_TABLET,
                bottom: EXPERTISE_TITLE_ZONE_BOTTOM_RATIO_TABLET,
            };
        }

        return {
            top: EXPERTISE_TITLE_ZONE_TOP_RATIO_MOBILE,
            bottom: EXPERTISE_TITLE_ZONE_BOTTOM_RATIO_MOBILE,
        };
    };

    const getExpertiseItemRevealZoneRatio = () => {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;

        if (viewportWidth >= 1280) {
            return {
                top: EXPERTISE_ITEM_ZONE_TOP_RATIO_DESKTOP,
                bottom: EXPERTISE_ITEM_ZONE_BOTTOM_RATIO_DESKTOP,
            };
        }

        if (viewportWidth >= 800) {
            return {
                top: EXPERTISE_ITEM_ZONE_TOP_RATIO_TABLET,
                bottom: EXPERTISE_ITEM_ZONE_BOTTOM_RATIO_TABLET,
            };
        }

        return {
            top: EXPERTISE_ITEM_ZONE_TOP_RATIO_MOBILE,
            bottom: EXPERTISE_ITEM_ZONE_BOTTOM_RATIO_MOBILE,
        };
    };

    const getIsExpertiseTitleInRevealZone = () => {
        // title-wrap이 100vh여도 실제 텍스트(h2) 위치 기준으로 reveal 트리거를 판정한다.
        const titleMeasureElement = expertiseTitle || expertiseTitleWrap || expertiseSection;
        const titleMeasureRect = titleMeasureElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;

        if (titleMeasureRect.bottom <= 0 || titleMeasureRect.top >= viewportHeight) {
            return false;
        }

        const titleCenterY = titleMeasureRect.top + titleMeasureRect.height * 0.5;
        const titleRevealZone = getExpertiseTitleRevealZoneRatio();
        const revealZoneTop = viewportHeight * titleRevealZone.top;
        const revealZoneBottom = viewportHeight * titleRevealZone.bottom;
        const isCenterInsideRevealZone = titleCenterY >= revealZoneTop && titleCenterY <= revealZoneBottom;
        const hasCenterPassedRevealZoneWhileVisible = titleCenterY < revealZoneTop && titleMeasureRect.bottom > 0;

        return isCenterInsideRevealZone || hasCenterPassedRevealZoneWhileVisible;
    };

    const splitExpertiseTitleLines = (titleElement) => {
        if (!titleElement) {
            return [];
        }

        if (!titleElement.hasAttribute('data-expertise-split')) {
            const rawLineHtmlList = titleElement.innerHTML
                .split(/<br\s*\/?>/i)
                .map((lineHtml) => lineHtml.trim())
                .filter(Boolean);

            const normalizedLineHtmlList = rawLineHtmlList.length
                ? rawLineHtmlList
                : [titleElement.innerHTML.trim()];

            titleElement.innerHTML = normalizedLineHtmlList
                .map((lineHtml, lineIndex) => `<span data-line="${lineIndex}">${lineHtml}</span>`)
                .join('');
            titleElement.setAttribute('data-expertise-split', 'true');
        }

        const titleLineElements = Array.from(titleElement.querySelectorAll(':scope > span[data-line]'));
        titleLineElements.forEach((lineElement, lineIndex) => {
            lineElement.style.setProperty('--expertise-title-index', String(lineIndex));
        });

        return titleLineElements;
    };

    const applyExpertiseItemMetadata = () => {
        expertiseItems.forEach((itemElement, itemIndex) => {
            itemElement.setAttribute('data-expertise-item', '');
            itemElement.style.setProperty('--expertise-item-index', String(itemIndex));
            itemElement.style.setProperty('--expertise-item-delay-base', `${itemIndex * 20}ms`);
            itemElement.style.setProperty('--expertise-direction', itemIndex % 2 === 0 ? '1' : '-1');

            const revealPartElements = itemElement.querySelectorAll('.sub-title, .title, .des');
            revealPartElements.forEach((partElement, partIndex) => {
                partElement.style.setProperty('--expertise-part-index', String(partIndex));
            });
        });
    };

    const revealExpertiseItem = (itemElement) => {
        itemElement.classList.add('is-expertise-item-visible', 'is-expertise-item-revealed');
        pendingExpertiseItems.delete(itemElement);

        if (!pendingExpertiseItems.size) {
            expertiseSection.classList.add('is-expertise-reveal-complete');
            unbindItemRevealEvents();
        }
    };

    const revealAllExpertiseItems = () => {
        expertiseItems.forEach((itemElement) => {
            revealExpertiseItem(itemElement);
        });
    };

    const ensureExpertisePrehiddenState = () => {
        if (reducedMotionMediaQuery.matches) {
            return;
        }

        expertiseSection.classList.add('is-expertise-prehidden');
    };

    const activateExpertiseTitleReveal = () => {
        if (hasActivatedExpertiseTitle) {
            return;
        }

        hasActivatedExpertiseTitle = true;
        expertiseSection.classList.add('is-expertise-title-active');
        unbindTitleRevealEvents();
    };

    const runTitleRevealCheck = () => {
        titleRevealAnimationFrameId = 0;

        if (hasActivatedExpertiseTitle || reducedMotionMediaQuery.matches) {
            return;
        }

        if (getIsExpertiseTitleInRevealZone()) {
            activateExpertiseTitleReveal();
        }
    };

    const getExpertiseItemMeasureElement = (itemElement) => {
        const directFirstElement = itemElement.firstElementChild;
        if (directFirstElement && directFirstElement.classList.contains('box1')) {
            return directFirstElement;
        }

        const fallbackBoxElement = itemElement.querySelector('.box1');
        return fallbackBoxElement || itemElement;
    };

    const getIsExpertiseItemInRevealZone = (itemElement) => {
        // 모든 카드의 reveal 타이밍을 .contents가 아닌 .box1 위치 기준으로 통일한다.
        const revealMeasureElement = getExpertiseItemMeasureElement(itemElement);
        const itemRect = revealMeasureElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;

        if (itemRect.bottom <= 0 || itemRect.top >= viewportHeight) {
            return false;
        }

        const itemCenterY = itemRect.top + itemRect.height * 0.5;
        const itemRevealZone = getExpertiseItemRevealZoneRatio();
        const revealZoneTop = viewportHeight * itemRevealZone.top;
        const revealZoneBottom = viewportHeight * itemRevealZone.bottom;
        // 카드 중심점이 중앙 밴드에 들어오거나, 빠른 스크롤로 밴드를 지난 직후(여전히 화면 내)면 reveal 처리한다.
        const isCenterInsideRevealZone = itemCenterY >= revealZoneTop && itemCenterY <= revealZoneBottom;
        const hasCenterPassedRevealZoneWhileVisible = itemCenterY < revealZoneTop && itemRect.bottom > 0;

        return isCenterInsideRevealZone || hasCenterPassedRevealZoneWhileVisible;
    };

    const queueTitleRevealCheck = () => {
        if (titleRevealAnimationFrameId || hasActivatedExpertiseTitle || reducedMotionMediaQuery.matches) {
            return;
        }

        titleRevealAnimationFrameId = requestAnimationFrame(runTitleRevealCheck);
    };

    const bindTitleRevealEvents = () => {
        if (isTitleRevealEventsBound) {
            return;
        }

        isTitleRevealEventsBound = true;
        titleRevealEventTargets.forEach((target) => {
            target.addEventListener('scroll', queueTitleRevealCheck, { passive: true });
        });
        window.addEventListener('resize', queueTitleRevealCheck);
        window.addEventListener('orientationchange', queueTitleRevealCheck);
    };

    const unbindTitleRevealEvents = () => {
        if (!isTitleRevealEventsBound) {
            return;
        }

        isTitleRevealEventsBound = false;
        titleRevealEventTargets.forEach((target) => {
            target.removeEventListener('scroll', queueTitleRevealCheck);
        });
        window.removeEventListener('resize', queueTitleRevealCheck);
        window.removeEventListener('orientationchange', queueTitleRevealCheck);

        if (titleRevealAnimationFrameId) {
            cancelAnimationFrame(titleRevealAnimationFrameId);
            titleRevealAnimationFrameId = 0;
        }
    };

    const runItemRevealCheck = () => {
        itemRevealAnimationFrameId = 0;

        if (reducedMotionMediaQuery.matches || !pendingExpertiseItems.size) {
            return;
        }

        pendingExpertiseItems.forEach((itemElement) => {
            if (getIsExpertiseItemInRevealZone(itemElement)) {
                revealExpertiseItem(itemElement);
            }
        });
    };

    const queueItemRevealCheck = () => {
        if (itemRevealAnimationFrameId || reducedMotionMediaQuery.matches || !pendingExpertiseItems.size) {
            return;
        }

        itemRevealAnimationFrameId = requestAnimationFrame(runItemRevealCheck);
    };

    const bindItemRevealEvents = () => {
        if (isItemRevealEventsBound || !pendingExpertiseItems.size) {
            return;
        }

        isItemRevealEventsBound = true;
        itemRevealEventTargets.forEach((target) => {
            target.addEventListener('scroll', queueItemRevealCheck, { passive: true });
        });
        window.addEventListener('resize', queueItemRevealCheck);
        window.addEventListener('orientationchange', queueItemRevealCheck);
    };

    const unbindItemRevealEvents = () => {
        if (!isItemRevealEventsBound) {
            return;
        }

        isItemRevealEventsBound = false;
        itemRevealEventTargets.forEach((target) => {
            target.removeEventListener('scroll', queueItemRevealCheck);
        });
        window.removeEventListener('resize', queueItemRevealCheck);
        window.removeEventListener('orientationchange', queueItemRevealCheck);

        if (itemRevealAnimationFrameId) {
            cancelAnimationFrame(itemRevealAnimationFrameId);
            itemRevealAnimationFrameId = 0;
        }
    };

    const applyExpertiseSettledState = (preserveInView = true) => {
        ensureExpertisePrehiddenState();
        expertiseSection.classList.add('is-expertise-title-active', 'is-expertise-reveal-complete');
        expertiseSection.classList.toggle('is-expertise-inview', preserveInView);
        hasActivatedExpertiseTitle = true;
        revealAllExpertiseItems();
    };

    const syncExpertiseInViewState = (nextInView) => {
        isExpertiseInView = nextInView;
        expertiseSection.classList.toggle('is-expertise-inview', isExpertiseInView);

        if (!isExpertiseInView) {
            return;
        }

        if (reducedMotionMediaQuery.matches) {
            applyExpertiseSettledState(true);
            return;
        }

        queueTitleRevealCheck();
        queueItemRevealCheck();
    };

    const handleReducedMotionChange = () => {
        if (reducedMotionMediaQuery.matches) {
            applyExpertiseSettledState(isExpertiseInView);
            return;
        }

        ensureExpertisePrehiddenState();

        bindTitleRevealEvents();
        bindItemRevealEvents();
        queueTitleRevealCheck();
        queueItemRevealCheck();
    };

    const handlePageShow = (event) => {
        if (!event.persisted) {
            return;
        }

        const shouldPreserveInView = isExpertiseInView || getIsElementInViewport(expertiseSection);

        if (reducedMotionMediaQuery.matches) {
            applyExpertiseSettledState(shouldPreserveInView);
            return;
        }

        expertiseSection.classList.toggle('is-expertise-inview', shouldPreserveInView);

        if (shouldPreserveInView) {
            queueTitleRevealCheck();
            queueItemRevealCheck();
        }
    };

    const expertiseTitleLines = splitExpertiseTitleLines(expertiseTitle);
    applyExpertiseItemMetadata();

    if (!expertiseTitleLines.length && !expertiseItems.length) {
        expertiseSection.classList.add('is-expertise-inview');
        return;
    }

    if (!pendingExpertiseItems.size) {
        expertiseSection.classList.add('is-expertise-reveal-complete');
    }

    ensureExpertisePrehiddenState();
    syncExpertiseInViewState(getIsElementInViewport(expertiseSection));
    bindTitleRevealEvents();
    bindItemRevealEvents();
    queueTitleRevealCheck();
    queueItemRevealCheck();

    if (typeof IntersectionObserver === 'function') {
        expertiseSectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                syncExpertiseInViewState(entry.isIntersecting);
            });
        }, {
            root: null,
            threshold: EXPERTISE_SECTION_THRESHOLD,
        });
        expertiseSectionObserver.observe(expertiseSection);
    } else if (reducedMotionMediaQuery.matches) {
        applyExpertiseSettledState(isExpertiseInView);
    } else {
        activateExpertiseTitleReveal();
        revealAllExpertiseItems();
        expertiseSection.classList.add('is-expertise-reveal-complete');
    }

    if (reducedMotionMediaQuery.matches) {
        applyExpertiseSettledState(isExpertiseInView);
    }

    window.addEventListener('pageshow', handlePageShow);

    if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
        reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
    } else if (typeof reducedMotionMediaQuery.addListener === 'function') {
        reducedMotionMediaQuery.addListener(handleReducedMotionChange);
    }

    window.addEventListener('beforeunload', () => {
        window.removeEventListener('pageshow', handlePageShow);

        if (expertiseSectionObserver) {
            expertiseSectionObserver.disconnect();
        }

        unbindTitleRevealEvents();
        unbindItemRevealEvents();

        if (typeof reducedMotionMediaQuery.removeEventListener === 'function') {
            reducedMotionMediaQuery.removeEventListener('change', handleReducedMotionChange);
        } else if (typeof reducedMotionMediaQuery.removeListener === 'function') {
            reducedMotionMediaQuery.removeListener(handleReducedMotionChange);
        }
    });
}

/**
 * Intro 이미지 2개를 스크롤 진행도에 맞춰 교차 이동시킨다.
 * - 첫 번째 이미지는 시작 Y -> 두 번째 이미지의 시작 Y
 * - 두 번째 이미지는 시작 Y -> 첫 번째 이미지의 시작 Y
 * - CSS 변수(--intro-scroll-progress)만 갱신해 스타일 충돌을 줄인다.
 */
/**
 * Works 타이틀(H3) 텍스트 리빌 인터랙션을 초기화한다.
 * 1) h3 내부를 줄 단위(span)로 분리해 stagger reveal
 * 2) 스크롤 구간(디바이스별 밴드)에 들어오면 한 번만 노출
 * 3) prefers-reduced-motion 환경에서는 즉시 노출
 */
function initWorksHeadingReveal() {
    const worksSection = document.querySelector('#works');
    const worksTitles = worksSection
        ? Array.from(worksSection.querySelectorAll(':scope > article .title-btn1 > h3.title'))
        : [];

    if (!worksSection || !worksTitles.length) {
        return;
    }

    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const WORKS_SECTION_THRESHOLD = 0.08;
    const WORKS_TITLE_ZONE_TOP_RATIO_DESKTOP = 0.66;
    const WORKS_TITLE_ZONE_BOTTOM_RATIO_DESKTOP = 0.74;
    const WORKS_TITLE_ZONE_TOP_RATIO_TABLET = 0.64;
    const WORKS_TITLE_ZONE_BOTTOM_RATIO_TABLET = 0.76;
    const WORKS_TITLE_ZONE_TOP_RATIO_MOBILE = 0.62;
    const WORKS_TITLE_ZONE_BOTTOM_RATIO_MOBILE = 0.78;
    let isWorksInView = false;
    let worksSectionObserver = null;
    let worksTitleRevealAnimationFrameId = 0;
    let isWorksTitleRevealEventsBound = false;
    const pendingWorksTitles = new Set(worksTitles);

    const isScrollableOverflowValue = (overflowValue) => /(auto|scroll|overlay)/.test(overflowValue);

    const getIsElementInViewport = (element) => {
        const elementRect = element.getBoundingClientRect();
        return elementRect.bottom > 0 && elementRect.top < window.innerHeight;
    };

    const getWorksTitleRevealEventTargets = () => {
        const targets = [window, document, document.documentElement];
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);
        const bodyScrollEnabled = isScrollableOverflowValue(bodyStyles.overflowY) || isScrollableOverflowValue(bodyStyles.overflow);
        const htmlScrollLocked = /(hidden|clip)/.test(htmlStyles.overflowY) || /(hidden|clip)/.test(htmlStyles.overflow);

        if (bodyScrollEnabled || htmlScrollLocked) {
            targets.push(document.body);
        }

        return Array.from(new Set(targets));
    };

    const worksTitleRevealEventTargets = getWorksTitleRevealEventTargets();

    const getWorksTitleRevealZoneRatio = () => {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;

        if (viewportWidth >= 1280) {
            return {
                top: WORKS_TITLE_ZONE_TOP_RATIO_DESKTOP,
                bottom: WORKS_TITLE_ZONE_BOTTOM_RATIO_DESKTOP,
            };
        }

        if (viewportWidth >= 800) {
            return {
                top: WORKS_TITLE_ZONE_TOP_RATIO_TABLET,
                bottom: WORKS_TITLE_ZONE_BOTTOM_RATIO_TABLET,
            };
        }

        return {
            top: WORKS_TITLE_ZONE_TOP_RATIO_MOBILE,
            bottom: WORKS_TITLE_ZONE_BOTTOM_RATIO_MOBILE,
        };
    };

    const splitWorksTitleLines = (titleElement) => {
        if (!titleElement) {
            return;
        }

        if (!titleElement.hasAttribute('data-works-split')) {
            const rawLineHtmlList = titleElement.innerHTML
                .split(/<br\s*\/?>/i)
                .map((lineHtml) => lineHtml.trim())
                .filter(Boolean);

            const normalizedLineHtmlList = rawLineHtmlList.length
                ? rawLineHtmlList
                : [titleElement.innerHTML.trim()];

            titleElement.innerHTML = normalizedLineHtmlList
                .map((lineHtml, lineIndex) => `<span data-line="${lineIndex}">${lineHtml}</span>`)
                .join('');
            titleElement.setAttribute('data-works-split', 'true');
        }

        const titleLineElements = Array.from(titleElement.querySelectorAll(':scope > span[data-line]'));
        titleLineElements.forEach((lineElement, lineIndex) => {
            lineElement.style.setProperty('--works-title-index', String(lineIndex));
        });
    };

    const applyWorksTitleMetadata = () => {
        worksTitles.forEach((titleElement, titleIndex) => {
            titleElement.setAttribute('data-works-title', '');
            titleElement.style.setProperty('--works-title-order', String(titleIndex));
            splitWorksTitleLines(titleElement);
        });
    };

    const revealWorksTitle = (titleElement) => {
        titleElement.classList.add('is-works-title-visible', 'is-works-title-revealed');
        pendingWorksTitles.delete(titleElement);

        if (!pendingWorksTitles.size) {
            worksSection.classList.add('is-works-reveal-complete');
            unbindWorksTitleRevealEvents();
        }
    };

    const revealAllWorksTitles = () => {
        worksTitles.forEach((titleElement) => {
            revealWorksTitle(titleElement);
        });
    };

    const ensureWorksPrehiddenState = () => {
        if (reducedMotionMediaQuery.matches) {
            return;
        }

        worksSection.classList.add('is-works-prehidden');
    };

    const getIsWorksTitleInRevealZone = (titleElement) => {
        const titleRect = titleElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;

        if (titleRect.bottom <= 0 || titleRect.top >= viewportHeight) {
            return false;
        }

        const titleCenterY = titleRect.top + titleRect.height * 0.5;
        const titleRevealZone = getWorksTitleRevealZoneRatio();
        const revealZoneTop = viewportHeight * titleRevealZone.top;
        const revealZoneBottom = viewportHeight * titleRevealZone.bottom;
        const isCenterInsideRevealZone = titleCenterY >= revealZoneTop && titleCenterY <= revealZoneBottom;
        const hasCenterPassedRevealZoneWhileVisible = titleCenterY < revealZoneTop && titleRect.bottom > 0;

        return isCenterInsideRevealZone || hasCenterPassedRevealZoneWhileVisible;
    };

    const runWorksTitleRevealCheck = () => {
        worksTitleRevealAnimationFrameId = 0;

        if (reducedMotionMediaQuery.matches || !pendingWorksTitles.size) {
            return;
        }

        pendingWorksTitles.forEach((titleElement) => {
            if (getIsWorksTitleInRevealZone(titleElement)) {
                revealWorksTitle(titleElement);
            }
        });
    };

    const queueWorksTitleRevealCheck = () => {
        if (worksTitleRevealAnimationFrameId || reducedMotionMediaQuery.matches || !pendingWorksTitles.size) {
            return;
        }

        worksTitleRevealAnimationFrameId = requestAnimationFrame(runWorksTitleRevealCheck);
    };

    const bindWorksTitleRevealEvents = () => {
        if (isWorksTitleRevealEventsBound || !pendingWorksTitles.size) {
            return;
        }

        isWorksTitleRevealEventsBound = true;
        worksTitleRevealEventTargets.forEach((target) => {
            target.addEventListener('scroll', queueWorksTitleRevealCheck, { passive: true });
        });
        window.addEventListener('resize', queueWorksTitleRevealCheck);
        window.addEventListener('orientationchange', queueWorksTitleRevealCheck);
    };

    const unbindWorksTitleRevealEvents = () => {
        if (!isWorksTitleRevealEventsBound) {
            return;
        }

        isWorksTitleRevealEventsBound = false;
        worksTitleRevealEventTargets.forEach((target) => {
            target.removeEventListener('scroll', queueWorksTitleRevealCheck);
        });
        window.removeEventListener('resize', queueWorksTitleRevealCheck);
        window.removeEventListener('orientationchange', queueWorksTitleRevealCheck);

        if (worksTitleRevealAnimationFrameId) {
            cancelAnimationFrame(worksTitleRevealAnimationFrameId);
            worksTitleRevealAnimationFrameId = 0;
        }
    };

    const applyWorksSettledState = (preserveInView = true) => {
        ensureWorksPrehiddenState();
        worksSection.classList.add('is-works-reveal-complete');
        worksSection.classList.toggle('is-works-inview', preserveInView);
        revealAllWorksTitles();
    };

    const syncWorksInViewState = (nextInView) => {
        isWorksInView = nextInView;
        worksSection.classList.toggle('is-works-inview', isWorksInView);

        if (!isWorksInView) {
            return;
        }

        if (reducedMotionMediaQuery.matches) {
            applyWorksSettledState(true);
            return;
        }

        queueWorksTitleRevealCheck();
    };

    const handleReducedMotionChange = () => {
        if (reducedMotionMediaQuery.matches) {
            applyWorksSettledState(isWorksInView);
            return;
        }

        ensureWorksPrehiddenState();
        bindWorksTitleRevealEvents();
        queueWorksTitleRevealCheck();
    };

    const handlePageShow = (event) => {
        if (!event.persisted) {
            return;
        }

        const shouldPreserveInView = isWorksInView || getIsElementInViewport(worksSection);

        if (reducedMotionMediaQuery.matches) {
            applyWorksSettledState(shouldPreserveInView);
            return;
        }

        worksSection.classList.toggle('is-works-inview', shouldPreserveInView);

        if (shouldPreserveInView) {
            queueWorksTitleRevealCheck();
        }
    };

    applyWorksTitleMetadata();

    ensureWorksPrehiddenState();
    syncWorksInViewState(getIsElementInViewport(worksSection));
    bindWorksTitleRevealEvents();
    queueWorksTitleRevealCheck();

    if (typeof IntersectionObserver === 'function') {
        worksSectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                syncWorksInViewState(entry.isIntersecting);
            });
        }, {
            root: null,
            threshold: WORKS_SECTION_THRESHOLD,
        });
        worksSectionObserver.observe(worksSection);
    } else if (reducedMotionMediaQuery.matches) {
        applyWorksSettledState(isWorksInView);
    } else {
        revealAllWorksTitles();
        worksSection.classList.add('is-works-reveal-complete');
    }

    if (reducedMotionMediaQuery.matches) {
        applyWorksSettledState(isWorksInView);
    }

    window.addEventListener('pageshow', handlePageShow);

    if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
        reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
    } else if (typeof reducedMotionMediaQuery.addListener === 'function') {
        reducedMotionMediaQuery.addListener(handleReducedMotionChange);
    }

    window.addEventListener('beforeunload', () => {
        window.removeEventListener('pageshow', handlePageShow);

        if (worksSectionObserver) {
            worksSectionObserver.disconnect();
        }

        unbindWorksTitleRevealEvents();

        if (typeof reducedMotionMediaQuery.removeEventListener === 'function') {
            reducedMotionMediaQuery.removeEventListener('change', handleReducedMotionChange);
        } else if (typeof reducedMotionMediaQuery.removeListener === 'function') {
            reducedMotionMediaQuery.removeListener(handleReducedMotionChange);
        }
    });
}

function initIntroImageScrollSwap() {
    const introSection = document.querySelector('#intro');
    const introImages = introSection ? introSection.querySelectorAll('.placeholder-wrap .img-placeholder') : [];
    const INTRO_SCROLL_PROGRESS_POWER = 1.45;
    const INTRO_SCROLL_EASE_BLEND = 0.82;
    const INTRO_SCROLL_LINEAR_RESPONSE_WEIGHT = 0.3;
    const INTRO_VISUAL_LERP_FACTOR = 0.13;
    const INTRO_VISUAL_SETTLE_EPSILON = 0.00035;
    const INTRO_VISUAL_COMPLETE_THRESHOLD = 0.9965;
    const INTRO_RAW_COMPLETE_THRESHOLD = 0.999;

    if (!introSection || introImages.length < 2) {
        return;
    }

    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const introScrollSwapForceMediaQuery = window.matchMedia('(max-width: 1279px)');
    let isScrollTicking = false;
    let isScrollSwapEventsBound = false;
    let visualIntroProgress = 0;
    let targetIntroProgress = 0;
    let latestRawIntroProgress = 0;
    let progressAnimationFrameId = 0;
    const isScrollableOverflowValue = (overflowValue) => /(auto|scroll|overlay)/.test(overflowValue);

    const getScrollEventTargets = () => {
        const targets = [window, document, document.documentElement];
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);
        const bodyScrollEnabled = isScrollableOverflowValue(bodyStyles.overflowY) || isScrollableOverflowValue(bodyStyles.overflow);
        const htmlScrollLocked = /(hidden|clip)/.test(htmlStyles.overflowY) || /(hidden|clip)/.test(htmlStyles.overflow);

        if (bodyScrollEnabled || htmlScrollLocked) {
            targets.push(document.body);
        }

        return Array.from(new Set(targets));
    };
    const scrollEventTargets = getScrollEventTargets();

    const clampProgress = (value) => {
        return Math.min(1, Math.max(0, value));
    };

    const easeInOutSmootherstep = (progressValue) => {
        return progressValue * progressValue * progressValue
            * (progressValue * (progressValue * 6 - 15) + 10);
    };

    const mapToSmoothedScrollProgress = (linearProgress) => {
        const normalizedLinearProgress = clampProgress(linearProgress);
        const slowedProgress = Math.pow(normalizedLinearProgress, INTRO_SCROLL_PROGRESS_POWER);
        const easedBaseProgress = easeInOutSmootherstep(slowedProgress);
        const easedProgress = normalizedLinearProgress
            + (easedBaseProgress - normalizedLinearProgress) * INTRO_SCROLL_EASE_BLEND;
        const responseBoostedProgress = normalizedLinearProgress * INTRO_SCROLL_LINEAR_RESPONSE_WEIGHT
            + easedProgress * (1 - INTRO_SCROLL_LINEAR_RESPONSE_WEIGHT);
        return clampProgress(responseBoostedProgress);
    };

    const getPageScrollTop = () => {
        return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const getIntroPageTop = () => {
        const currentScrollTop = getPageScrollTop();
        return introSection.getBoundingClientRect().top + currentScrollTop;
    };

    const getIntroRawScrollProgress = () => {
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
        const introScrollDistance = Math.max(introSection.offsetHeight - viewportHeight, 1);
        const introProgressedDistance = getPageScrollTop() - getIntroPageTop();
        const normalizedDistance = Math.min(introScrollDistance, Math.max(0, introProgressedDistance));
        return clampProgress(normalizedDistance / introScrollDistance);
    };

    const applyScrollProgress = (visualProgress, rawProgress) => {
        const normalizedVisualProgress = clampProgress(visualProgress);
        const normalizedRawProgress = clampProgress(rawProgress);
        const isVisualComplete = normalizedVisualProgress >= INTRO_VISUAL_COMPLETE_THRESHOLD;
        const isRawComplete = normalizedRawProgress >= INTRO_RAW_COMPLETE_THRESHOLD;
        introSection.style.setProperty('--intro-scroll-progress', normalizedVisualProgress.toFixed(4));
        introSection.dataset.introVisualProgress = normalizedVisualProgress.toFixed(4);
        introSection.dataset.introRawProgress = normalizedRawProgress.toFixed(4);
        introSection.dataset.introVisualComplete = String(isVisualComplete && isRawComplete);
    };

    const cancelVisualProgressAnimation = () => {
        if (!progressAnimationFrameId) {
            return;
        }

        cancelAnimationFrame(progressAnimationFrameId);
        progressAnimationFrameId = 0;
    };

    const queueVisualProgressAnimation = () => {
        if (progressAnimationFrameId) {
            return;
        }

        progressAnimationFrameId = requestAnimationFrame(() => {
            progressAnimationFrameId = 0;
            const delta = targetIntroProgress - visualIntroProgress;
            const nextProgress = visualIntroProgress + delta * INTRO_VISUAL_LERP_FACTOR;
            const isSettled = Math.abs(delta) <= INTRO_VISUAL_SETTLE_EPSILON;
            visualIntroProgress = isSettled ? targetIntroProgress : clampProgress(nextProgress);
            applyScrollProgress(visualIntroProgress, latestRawIntroProgress);

            if (!isSettled) {
                queueVisualProgressAnimation();
            }
        });
    };

    const updateProgressTarget = () => {
        latestRawIntroProgress = getIntroRawScrollProgress();
        targetIntroProgress = mapToSmoothedScrollProgress(latestRawIntroProgress);
        queueVisualProgressAnimation();
    };

    const syncProgressImmediately = () => {
        latestRawIntroProgress = getIntroRawScrollProgress();
        targetIntroProgress = mapToSmoothedScrollProgress(latestRawIntroProgress);
        visualIntroProgress = targetIntroProgress;
        applyScrollProgress(visualIntroProgress, latestRawIntroProgress);
    };

    const applyStaticScrollProgress = () => {
        cancelVisualProgressAnimation();
        visualIntroProgress = 0;
        targetIntroProgress = 0;
        latestRawIntroProgress = 0;
        introSection.style.setProperty('--intro-scroll-progress', '0');
        introSection.dataset.introVisualProgress = '0.0000';
        introSection.dataset.introRawProgress = '0.0000';
        introSection.dataset.introVisualComplete = 'true';
    };

    const queueScrollProgressUpdate = () => {
        if (isScrollTicking) {
            return;
        }

        isScrollTicking = true;
        requestAnimationFrame(() => {
            isScrollTicking = false;
            updateProgressTarget();
        });
    };

    const bindScrollSwapEvents = () => {
        if (isScrollSwapEventsBound) {
            return;
        }

        scrollEventTargets.forEach((target) => {
            target.addEventListener('scroll', queueScrollProgressUpdate, { passive: true });
        });

        window.addEventListener('resize', queueScrollProgressUpdate);
        window.addEventListener('load', queueScrollProgressUpdate);
        window.addEventListener('pageshow', queueScrollProgressUpdate);
        isScrollSwapEventsBound = true;
    };

    const unbindScrollSwapEvents = () => {
        if (!isScrollSwapEventsBound) {
            return;
        }

        scrollEventTargets.forEach((target) => {
            target.removeEventListener('scroll', queueScrollProgressUpdate);
        });

        window.removeEventListener('resize', queueScrollProgressUpdate);
        window.removeEventListener('load', queueScrollProgressUpdate);
        window.removeEventListener('pageshow', queueScrollProgressUpdate);
        isScrollSwapEventsBound = false;
    };

    /*
     * [Intro 카드 스크롤 진행값 안전 기준]
     * 1) 모바일/태블릿(<=1279px): reduced-motion 환경에서도 PC 축소 뷰와 동일하게 진행값 갱신
     * 2) 데스크톱(>=1280px): reduced-motion이면 진행값을 고정해 기존 접근성 정책 유지
     */
    const getShouldFreezeIntroSwap = () => {
        return reducedMotionMediaQuery.matches && !introScrollSwapForceMediaQuery.matches;
    };

    const applyIntroScrollSwapMode = () => {
        if (getShouldFreezeIntroSwap()) {
            unbindScrollSwapEvents();
            applyStaticScrollProgress();
            return;
        }

        bindScrollSwapEvents();
        syncProgressImmediately();
    };

    const handleReducedMotionChange = () => {
        applyIntroScrollSwapMode();
    };

    const handleIntroScrollSwapBreakpointChange = () => {
        applyIntroScrollSwapMode();
    };

    applyIntroScrollSwapMode();

    if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
        reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
    } else if (typeof reducedMotionMediaQuery.addListener === 'function') {
        reducedMotionMediaQuery.addListener(handleReducedMotionChange);
    }

    if (typeof introScrollSwapForceMediaQuery.addEventListener === 'function') {
        introScrollSwapForceMediaQuery.addEventListener('change', handleIntroScrollSwapBreakpointChange);
    } else if (typeof introScrollSwapForceMediaQuery.addListener === 'function') {
        introScrollSwapForceMediaQuery.addListener(handleIntroScrollSwapBreakpointChange);
    }

    window.addEventListener('beforeunload', () => {
        unbindScrollSwapEvents();
        cancelVisualProgressAnimation();

        if (typeof reducedMotionMediaQuery.removeEventListener === 'function') {
            reducedMotionMediaQuery.removeEventListener('change', handleReducedMotionChange);
        } else if (typeof reducedMotionMediaQuery.removeListener === 'function') {
            reducedMotionMediaQuery.removeListener(handleReducedMotionChange);
        }

        if (typeof introScrollSwapForceMediaQuery.removeEventListener === 'function') {
            introScrollSwapForceMediaQuery.removeEventListener('change', handleIntroScrollSwapBreakpointChange);
        } else if (typeof introScrollSwapForceMediaQuery.removeListener === 'function') {
            introScrollSwapForceMediaQuery.removeListener(handleIntroScrollSwapBreakpointChange);
        }
    });
}

/**
 * 헤더 Contact 링크는 섹션 이동 대신 브라우저 기본 알림창을 표시한다.
 */
function initWayContactAlert() {
    const wayContactLink = document.querySelector('.way-contact');

    if (!wayContactLink) {
        return;
    }

    wayContactLink.addEventListener('click', (e) => {
        e.preventDefault();
        window.alert('입사&면접 및 협업 제안은 jayworkofficial23@gmail.com으로 보내주세요. 감사합니다.');
    });
}

/**
 * 푸터 연락처 아이콘 클릭 시 이메일 주소를 클립보드에 복사하고 알림창을 표시한다.
 */
function initCopyEmail() {
    const copyIconLink = document.querySelector('footer .contact .icon a');

    if (!copyIconLink) {
        return;
    }

    copyIconLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const emailAddress = 'jayworkofficial23@gmail.com';

        try {
            // 최신 클립보드 API 시도
            await navigator.clipboard.writeText(emailAddress);
            window.alert(`[복사 완료] ${emailAddress}\n이메일 주소가 클립보드에 복사되었습니다.`);
        } catch (err) {
            // 구형 브라우저 폴백(Fallback) 방어코드
            const textArea = document.createElement('textarea');
            textArea.value = emailAddress;
            textArea.style.position = 'absolute';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                window.alert(`[복사 완료] ${emailAddress}\n이메일 주소가 클립보드에 복사되었습니다.`);
            } catch (fallbackErr) {
                window.alert('복사에 실패했습니다. 직접 메일 주소를 드래그하여 복사해 주세요.');
            } finally {
                document.body.removeChild(textArea);
            }
        }
    });
}

/**
 * 글로벌 헤더 메뉴 인터랙션(열기/닫기, 스크롤 임계값 노출)을 초기화한다.
 */
function initHeaderMenu() {
    const header = document.querySelector('.global-header');
    const menuToggleButton = document.querySelector('#menu-toggle');
    const headerSecondary = document.querySelector('#header-secondary');
    const htmlElement = document.documentElement;

    if (!header || !menuToggleButton || !headerSecondary) {
        return;
    }

    const MOBILE_MEDIA_QUERY = '(max-width: 799px)';
    const mobileMediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const heroNav = document.querySelector('#hero .hero-nav');
    const headerSecondaryInner = headerSecondary.querySelector('.header-secondary-inner');
    const headerLinks = headerSecondary.querySelectorAll('a[href^="#"]');
    const MENU_OPEN_TRANSITION_FALLBACK_MS = 520;
    const MENU_CLOSE_TRANSITION_FALLBACK_MS = 560;

    let isMenuOpen = false;
    let isMenuTransitioning = false;
    let isHeaderScrollTicking = false;
    let menuTransitionTimer = null;
    let menuResizeObserver = null;
    let headerActivationThreshold = 100;

    const isScrollableOverflowValue = (overflowValue) => /(auto|scroll|overlay)/.test(overflowValue);

    // 현재 프로젝트는 body가 실제 스크롤 컨테이너이므로 window 외 스크롤 타겟도 함께 감지한다.
    const getScrollEventTargets = () => {
        const targets = [window, document, document.documentElement];
        const bodyStyles = window.getComputedStyle(document.body);
        const htmlStyles = window.getComputedStyle(document.documentElement);
        const bodyScrollEnabled = isScrollableOverflowValue(bodyStyles.overflowY) || isScrollableOverflowValue(bodyStyles.overflow);
        const htmlScrollLocked = /(hidden|clip)/.test(htmlStyles.overflowY) || /(hidden|clip)/.test(htmlStyles.overflow);

        if (bodyScrollEnabled || htmlScrollLocked) {
            targets.push(document.body);
        }

        return Array.from(new Set(targets));
    };
    const scrollEventTargets = getScrollEventTargets();

    const getPageScrollTop = () => {
        return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const getHeaderActivationThreshold = () => {
        const fallbackThreshold = 100;

        if (!heroNav) {
            return fallbackThreshold;
        }

        const measuredHeight = Math.max(heroNav.offsetHeight, heroNav.getBoundingClientRect().height);
        return measuredHeight > 0 ? measuredHeight : fallbackThreshold;
    };

    const clearMenuTransitionTimer = () => {
        if (menuTransitionTimer) {
            clearTimeout(menuTransitionTimer);
            menuTransitionTimer = null;
        }
    };

    const getMenuContentHeight = () => {
        const menuInner = headerSecondaryInner || headerSecondary;
        return Math.ceil(menuInner.scrollHeight);
    };

    const syncMenuHeight = () => {
        if (!isMenuOpen) {
            return;
        }

        headerSecondary.style.height = `${getMenuContentHeight()}px`;
    };

    const finalizeMenuTransition = () => {
        clearMenuTransitionTimer();
        isMenuTransitioning = false;

        if (isMenuOpen) {
            header.classList.remove('is-menu-closing');
            syncMenuHeight();
            return;
        }

        headerSecondary.style.height = '0px';
        header.classList.remove('is-menu-closing');
    };

    const updateHeaderActiveState = () => {
        const heroNavRect = heroNav ? heroNav.getBoundingClientRect() : null;
        const scrollDistanceFromHeroNavTop = heroNavRect ? Math.max(0, -heroNavRect.top) : getPageScrollTop();
        const shouldActivateHeader = mobileMediaQuery.matches || scrollDistanceFromHeroNavTop >= headerActivationThreshold;

        header.classList.toggle('is-active', shouldActivateHeader);

        if (!shouldActivateHeader && isMenuOpen) {
            toggleMenu(false);
        }
    };

    const queueHeaderActiveStateUpdate = () => {
        if (isHeaderScrollTicking) {
            return;
        }

        isHeaderScrollTicking = true;
        requestAnimationFrame(() => {
            isHeaderScrollTicking = false;
            updateHeaderActiveState();
        });
    };

    const refreshHeaderActivationContext = () => {
        headerActivationThreshold = getHeaderActivationThreshold();
        updateHeaderActiveState();
    };

    const openMenu = () => {
        isMenuOpen = true;
        isMenuTransitioning = true;

        htmlElement.setAttribute('data-menu-open', '');
        header.classList.remove('is-menu-closing');
        header.classList.add('is-menu-open');
        menuToggleButton.setAttribute('aria-expanded', 'true');
        menuToggleButton.setAttribute('aria-label', 'Close menu');
        headerSecondary.setAttribute('aria-hidden', 'false');

        requestAnimationFrame(() => {
            syncMenuHeight();
        });

        clearMenuTransitionTimer();
        menuTransitionTimer = window.setTimeout(finalizeMenuTransition, MENU_OPEN_TRANSITION_FALLBACK_MS);
    };

    const closeMenu = () => {
        isMenuOpen = false;
        isMenuTransitioning = true;

        htmlElement.removeAttribute('data-menu-open');
        headerSecondary.style.height = `${getMenuContentHeight()}px`;
        header.classList.remove('is-menu-open');
        header.classList.add('is-menu-closing');
        menuToggleButton.setAttribute('aria-expanded', 'false');
        menuToggleButton.setAttribute('aria-label', 'Open menu');
        headerSecondary.setAttribute('aria-hidden', 'true');

        requestAnimationFrame(() => {
            headerSecondary.style.height = '0px';
        });

        clearMenuTransitionTimer();
        menuTransitionTimer = window.setTimeout(finalizeMenuTransition, MENU_CLOSE_TRANSITION_FALLBACK_MS);
    };

    const toggleMenu = (forceOpen) => {
        const nextOpenState = typeof forceOpen === 'boolean' ? forceOpen : !isMenuOpen;

        if (isMenuTransitioning && nextOpenState === isMenuOpen) {
            return;
        }

        if (nextOpenState) {
            openMenu();
            return;
        }

        closeMenu();
    };

    if (typeof ResizeObserver === 'function' && headerSecondaryInner) {
        menuResizeObserver = new ResizeObserver(() => {
            syncMenuHeight();
        });
        menuResizeObserver.observe(headerSecondaryInner);
    }

    headerSecondary.style.height = '0px';
    headerSecondary.setAttribute('aria-hidden', 'true');
    menuToggleButton.setAttribute('aria-expanded', 'false');
    menuToggleButton.setAttribute('aria-controls', 'header-secondary');
    menuToggleButton.setAttribute('aria-label', 'Open menu');

    menuToggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMenu();
    });

    headerSecondary.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'height') {
            return;
        }

        finalizeMenuTransition();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMenuOpen) {
            toggleMenu(false);
            menuToggleButton.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!isMenuOpen) {
            return;
        }

        if (header.contains(e.target)) {
            return;
        }

        toggleMenu(false);
    });

    headerLinks.forEach((link) => {
        link.addEventListener('click', () => {
            toggleMenu(false);
        });
    });

    window.addEventListener('resize', () => {
        syncMenuHeight();
        refreshHeaderActivationContext();
    });

    scrollEventTargets.forEach((target) => {
        target.addEventListener('scroll', queueHeaderActiveStateUpdate, { passive: true });
    });
    window.addEventListener('hashchange', refreshHeaderActivationContext);
    window.addEventListener('load', refreshHeaderActivationContext);

    if (typeof mobileMediaQuery.addEventListener === 'function') {
        mobileMediaQuery.addEventListener('change', refreshHeaderActivationContext);
    } else if (typeof mobileMediaQuery.addListener === 'function') {
        mobileMediaQuery.addListener(refreshHeaderActivationContext);
    }

    window.addEventListener('beforeunload', () => {
        if (menuResizeObserver) {
            menuResizeObserver.disconnect();
        }
    });

    refreshHeaderActivationContext();
    requestAnimationFrame(refreshHeaderActivationContext);
}

/**
 * 메인 섹션 간 스크롤 핸드오프를 초기화한다.
 * 1) wheel 입력 기준으로 섹션 경계에서만 다음/이전 섹션으로 부드럽게 이동
 * 2) Intro는 이미지 스크롤(progress=1) 완료 전까지 아래 섹션으로 넘기지 않음
 * 3) 앵커(#hero/#intro/#expertise/#works/#contact) 클릭도 동일한 스무스 이동 사용
 * 4) 모달/헤더 메뉴가 열린 상태에서는 개입하지 않아 기존 인터랙션 충돌 방지
 */
function initSectionScrollHandoff() {
    const sectionSelectors = ['#hero', '#intro', '#expertise', '#works', 'footer'];
    const smoothAnchorTargets = new Set(['#hero', '#intro', '#expertise', '#works', '#contact']);
    const sections = sectionSelectors
        .map((selector) => document.querySelector(selector))
        .filter(Boolean);
    const introSection = document.querySelector('#intro');
    const expertiseSection = document.querySelector('#expertise');
    const footerSection = document.querySelector('footer');

    if (sections.length < 2) {
        return;
    }

    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const wheelHandoffMediaQuery = window.matchMedia('(pointer: fine) and (min-width: 1024px)');
    const touchHandoffMediaQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
    const WHEEL_DELTA_THRESHOLD = 1.5;
    const TOUCH_SWIPE_MIN_DELTA_PX = 56;
    const TOUCH_VERTICAL_DOMINANCE_RATIO = 1.15;
    const TOUCH_PREDICTION_GAIN = 1.1;
    const SECTION_EDGE_TOLERANCE_PX = 12;
    const SECTION_UPWARD_HANDOFF_MIN_BUFFER_PX = 32;
    const SECTION_UPWARD_HANDOFF_VIEWPORT_RATIO = 0.04;
    const SECTION_DOWNWARD_HANDOFF_MIN_BUFFER_PX = 18;
    const SECTION_DOWNWARD_HANDOFF_VIEWPORT_RATIO = 0.022;
    const INTRO_VISUAL_COMPLETE_MIN = 0.9965;
    const WHEEL_COOLDOWN_AFTER_ANIMATION_MS = 120;
    const WHEEL_PREDICTION_GAIN = 1.35;
    const SCROLL_DURATION_PER_PIXEL = 0.9;
    const MIN_SCROLL_ANIMATION_MS = 920;
    const MAX_SCROLL_ANIMATION_MS = 1850;
    let animationFrameId = 0;
    let isSectionAnimating = false;
    let currentAnimationToken = 0;
    let wheelCooldownUntil = 0;
    let lastWheelAnimationDirection = 0;
    let trackedTouchId = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchLastX = 0;
    let touchLastY = 0;
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    const clamp = (value, min, max) => {
        return Math.min(max, Math.max(min, value));
    };

    const getPageScrollTop = () => {
        return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    };

    const getViewportHeight = () => {
        return window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 1;
    };

    const setPageScrollTop = (scrollTopValue) => {
        const normalizedScrollTop = Math.max(0, scrollTopValue);
        window.scrollTo(0, normalizedScrollTop);
        document.documentElement.scrollTop = normalizedScrollTop;
        document.body.scrollTop = normalizedScrollTop;
    };

    const getSectionPageTop = (sectionElement) => {
        return sectionElement.getBoundingClientRect().top + getPageScrollTop();
    };

    const normalizeWheelDeltaY = (wheelEvent) => {
        if (wheelEvent.deltaMode === 1) {
            return wheelEvent.deltaY * 16;
        }

        if (wheelEvent.deltaMode === 2) {
            return wheelEvent.deltaY * getViewportHeight();
        }

        return wheelEvent.deltaY;
    };

    const getIntroCompletionTop = () => {
        if (!introSection) {
            return null;
        }

        const introTop = getSectionPageTop(introSection);
        const introScrollDistance = Math.max(introSection.offsetHeight - getViewportHeight(), 0);
        return introTop + introScrollDistance;
    };

    const getSectionUpwardHandoffBufferPx = (viewportHeight) => {
        const viewportBasedBuffer = viewportHeight * SECTION_UPWARD_HANDOFF_VIEWPORT_RATIO;
        return Math.max(SECTION_UPWARD_HANDOFF_MIN_BUFFER_PX, viewportBasedBuffer);
    };

    const getSectionDownwardHandoffBufferPx = (viewportHeight) => {
        const viewportBasedBuffer = viewportHeight * SECTION_DOWNWARD_HANDOFF_VIEWPORT_RATIO;
        return Math.max(SECTION_DOWNWARD_HANDOFF_MIN_BUFFER_PX, viewportBasedBuffer);
    };

    const isIntroVisualProgressComplete = () => {
        if (!introSection || reducedMotionMediaQuery.matches) {
            return true;
        }

        if (introSection.dataset.introVisualComplete === 'true') {
            return true;
        }

        const introVisualProgress = Number(introSection.dataset.introVisualProgress);
        if (!Number.isFinite(introVisualProgress)) {
            return true;
        }

        return introVisualProgress >= INTRO_VISUAL_COMPLETE_MIN;
    };

    const isMenuOpen = () => {
        return document.documentElement.hasAttribute('data-menu-open');
    };

    const hasOpenModal = () => {
        return Boolean(document.querySelector('.modal-projects.is-active'));
    };

    const isInteractionLocked = () => {
        return isMenuOpen() || hasOpenModal();
    };

    const cancelScrollAnimation = () => {
        if (!animationFrameId) {
            return;
        }

        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
        isSectionAnimating = false;
    };

    const animatePageScrollTo = (targetScrollTop, animationDirection = 0) => {
        const normalizedTargetScrollTop = Math.max(0, targetScrollTop);
        const startScrollTop = getPageScrollTop();
        const scrollDistance = normalizedTargetScrollTop - startScrollTop;

        if (Math.abs(scrollDistance) < 1) {
            setPageScrollTop(normalizedTargetScrollTop);
            return;
        }

        if (reducedMotionMediaQuery.matches) {
            setPageScrollTop(normalizedTargetScrollTop);
            return;
        }

        cancelScrollAnimation();
        isSectionAnimating = true;
        lastWheelAnimationDirection = animationDirection;
        const animationToken = ++currentAnimationToken;
        const animationStartTime = performance.now();
        const animationDuration = clamp(
            Math.abs(scrollDistance) * SCROLL_DURATION_PER_PIXEL,
            MIN_SCROLL_ANIMATION_MS,
            MAX_SCROLL_ANIMATION_MS
        );

        const easeInOutSmootherstep = (progressValue) => {
            return progressValue * progressValue * progressValue
                * (progressValue * (progressValue * 6 - 15) + 10);
        };

        const stepScrollAnimation = (currentTime) => {
            if (animationToken !== currentAnimationToken) {
                return;
            }

            const elapsedTime = currentTime - animationStartTime;
            const linearProgress = clamp(elapsedTime / animationDuration, 0, 1);
            const easedProgress = easeInOutSmootherstep(linearProgress);
            const nextScrollTop = startScrollTop + scrollDistance * easedProgress;
            setPageScrollTop(nextScrollTop);

            if (linearProgress < 1) {
                animationFrameId = requestAnimationFrame(stepScrollAnimation);
                return;
            }

            setPageScrollTop(normalizedTargetScrollTop);
            animationFrameId = 0;
            isSectionAnimating = false;
            wheelCooldownUntil = performance.now() + WHEEL_COOLDOWN_AFTER_ANIMATION_MS;
        };

        animationFrameId = requestAnimationFrame(stepScrollAnimation);
    };

    const getSectionBoundaries = () => {
        return sections.map((sectionElement) => {
            return {
                element: sectionElement,
                top: getSectionPageTop(sectionElement),
            };
        });
    };

    const getCurrentSectionIndex = (sectionBoundaries, scrollTopValue) => {
        let currentSectionIndex = 0;

        for (let boundaryIndex = 0; boundaryIndex < sectionBoundaries.length; boundaryIndex += 1) {
            if (scrollTopValue >= sectionBoundaries[boundaryIndex].top - SECTION_EDGE_TOLERANCE_PX) {
                currentSectionIndex = boundaryIndex;
            }
        }

        return currentSectionIndex;
    };

    const resolveWheelTargetTop = (direction, wheelDeltaY = 0) => {
        const sectionBoundaries = getSectionBoundaries();
        const currentScrollTop = getPageScrollTop();
        const predictedScrollTop = Math.max(0, currentScrollTop + wheelDeltaY * WHEEL_PREDICTION_GAIN);
        const viewportHeight = getViewportHeight();
        const currentSectionIndex = getCurrentSectionIndex(sectionBoundaries, currentScrollTop);
        const currentBoundary = sectionBoundaries[currentSectionIndex];

        if (!currentBoundary) {
            return null;
        }

        if (direction > 0) {
            if (currentSectionIndex >= sectionBoundaries.length - 1) {
                return null;
            }

            const nextBoundary = sectionBoundaries[currentSectionIndex + 1];
            let handoffTriggerTop = nextBoundary.top - viewportHeight - getSectionDownwardHandoffBufferPx(viewportHeight);

            if (introSection && currentBoundary.element === introSection) {
                const introCompletionTop = getIntroCompletionTop();
                handoffTriggerTop = Math.max(handoffTriggerTop, introCompletionTop);

                if (!isIntroVisualProgressComplete()) {
                    return null;
                }
            }

            if (Math.max(currentScrollTop, predictedScrollTop) < handoffTriggerTop - SECTION_EDGE_TOLERANCE_PX) {
                return null;
            }

            return Math.round(nextBoundary.top);
        }

        if (direction < 0) {
            if (currentSectionIndex <= 0) {
                return null;
            }

            const previousBoundary = sectionBoundaries[currentSectionIndex - 1];
            const handoffTriggerTop = currentBoundary.top + getSectionUpwardHandoffBufferPx(viewportHeight);

            if (Math.min(currentScrollTop, predictedScrollTop) > handoffTriggerTop + SECTION_EDGE_TOLERANCE_PX) {
                return null;
            }

            if (
                introSection
                && expertiseSection
                && currentBoundary.element === expertiseSection
                && previousBoundary.element === introSection
            ) {
                return Math.round(getIntroCompletionTop());
            }

            return Math.round(previousBoundary.top);
        }

        return null;
    };

    const resolveAnchorTargetTop = (hrefValue) => {
        if (!hrefValue || !smoothAnchorTargets.has(hrefValue)) {
            return null;
        }

        if (hrefValue === '#contact' && footerSection) {
            return Math.round(getSectionPageTop(footerSection));
        }

        const targetElement = document.querySelector(hrefValue);
        if (!targetElement) {
            return null;
        }

        return Math.round(getSectionPageTop(targetElement));
    };

    const handleWheel = (event) => {
        if (!wheelHandoffMediaQuery.matches || event.ctrlKey) {
            return;
        }

        const normalizedDeltaY = normalizeWheelDeltaY(event);
        if (Math.abs(normalizedDeltaY) < WHEEL_DELTA_THRESHOLD) {
            return;
        }

        const direction = normalizedDeltaY > 0 ? 1 : -1;
        const currentTime = performance.now();
        const isReverseDirectionDuringCooldown = currentTime < wheelCooldownUntil
            && lastWheelAnimationDirection !== 0
            && direction !== lastWheelAnimationDirection;

        if (currentTime < wheelCooldownUntil && !isReverseDirectionDuringCooldown) {
            if (event.cancelable) {
                event.preventDefault();
            }
            return;
        }

        if (isReverseDirectionDuringCooldown) {
            wheelCooldownUntil = 0;
        }

        if (isInteractionLocked()) {
            return;
        }

        if (isSectionAnimating) {
            if (event.cancelable) {
                event.preventDefault();
            }
            return;
        }

        const targetTop = resolveWheelTargetTop(direction, normalizedDeltaY);

        if (targetTop === null) {
            return;
        }

        if (event.cancelable) {
            event.preventDefault();
        }

        animatePageScrollTo(targetTop, direction);
    };

    const resetTrackedTouch = () => {
        trackedTouchId = null;
        touchStartX = 0;
        touchStartY = 0;
        touchLastX = 0;
        touchLastY = 0;
    };

    const findTouchById = (touchList, touchId) => {
        if (!touchList || touchId === null) {
            return null;
        }

        for (let touchIndex = 0; touchIndex < touchList.length; touchIndex += 1) {
            if (touchList[touchIndex].identifier === touchId) {
                return touchList[touchIndex];
            }
        }

        return null;
    };

    /*
     * 터치 디바이스(모바일/태블릿)에서만 세로 스와이프를 감지해
     * 섹션 경계 핸드오프를 wheel과 동일한 규칙으로 적용한다.
     */
    const handleTouchStart = (event) => {
        if (!touchHandoffMediaQuery.matches || isInteractionLocked() || isSectionAnimating) {
            resetTrackedTouch();
            return;
        }

        if (!event.touches || event.touches.length !== 1) {
            resetTrackedTouch();
            return;
        }

        const touch = event.touches[0];
        trackedTouchId = touch.identifier;
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchLastX = touch.clientX;
        touchLastY = touch.clientY;
    };

    const handleTouchMove = (event) => {
        if (trackedTouchId === null) {
            return;
        }

        const trackedTouch = findTouchById(event.touches, trackedTouchId);
        if (!trackedTouch) {
            return;
        }

        touchLastX = trackedTouch.clientX;
        touchLastY = trackedTouch.clientY;
    };

    const handleTouchEnd = (event) => {
        if (trackedTouchId === null || !touchHandoffMediaQuery.matches) {
            resetTrackedTouch();
            return;
        }

        const endTouch = findTouchById(event.changedTouches, trackedTouchId);
        if (!endTouch) {
            resetTrackedTouch();
            return;
        }

        touchLastX = endTouch.clientX;
        touchLastY = endTouch.clientY;

        const deltaX = touchLastX - touchStartX;
        const deltaY = touchStartY - touchLastY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        resetTrackedTouch();

        if (absDeltaY < TOUCH_SWIPE_MIN_DELTA_PX) {
            return;
        }

        if (absDeltaY <= absDeltaX * TOUCH_VERTICAL_DOMINANCE_RATIO) {
            return;
        }

        if (isInteractionLocked() || isSectionAnimating) {
            return;
        }

        const direction = deltaY > 0 ? 1 : -1;
        const currentTime = performance.now();
        const isReverseDirectionDuringCooldown = currentTime < wheelCooldownUntil
            && lastWheelAnimationDirection !== 0
            && direction !== lastWheelAnimationDirection;

        if (currentTime < wheelCooldownUntil && !isReverseDirectionDuringCooldown) {
            return;
        }

        if (isReverseDirectionDuringCooldown) {
            wheelCooldownUntil = 0;
        }

        const predictedDeltaY = deltaY * TOUCH_PREDICTION_GAIN;
        const targetTop = resolveWheelTargetTop(direction, predictedDeltaY);
        if (targetTop === null) {
            return;
        }

        animatePageScrollTo(targetTop, direction);
    };

    const handleTouchCancel = () => {
        resetTrackedTouch();
    };

    const handleAnchorClick = (event) => {
        const currentTarget = event.currentTarget;
        const hrefValue = currentTarget ? currentTarget.getAttribute('href') : null;
        const targetTop = resolveAnchorTargetTop(hrefValue);

        if (targetTop === null) {
            return;
        }

        event.preventDefault();
        animatePageScrollTo(targetTop, 0);
    };

    const handleReducedMotionChange = () => {
        if (reducedMotionMediaQuery.matches) {
            cancelScrollAnimation();
        }
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true, capture: true });

    anchorLinks.forEach((anchorLink) => {
        anchorLink.addEventListener('click', handleAnchorClick);
    });

    if (typeof reducedMotionMediaQuery.addEventListener === 'function') {
        reducedMotionMediaQuery.addEventListener('change', handleReducedMotionChange);
    } else if (typeof reducedMotionMediaQuery.addListener === 'function') {
        reducedMotionMediaQuery.addListener(handleReducedMotionChange);
    }

    window.addEventListener('beforeunload', () => {
        cancelScrollAnimation();
        window.removeEventListener('wheel', handleWheel, { capture: true });
        window.removeEventListener('touchstart', handleTouchStart, { capture: true });
        window.removeEventListener('touchmove', handleTouchMove, { capture: true });
        window.removeEventListener('touchend', handleTouchEnd, { capture: true });
        window.removeEventListener('touchcancel', handleTouchCancel, { capture: true });

        anchorLinks.forEach((anchorLink) => {
            anchorLink.removeEventListener('click', handleAnchorClick);
        });

        if (typeof reducedMotionMediaQuery.removeEventListener === 'function') {
            reducedMotionMediaQuery.removeEventListener('change', handleReducedMotionChange);
        } else if (typeof reducedMotionMediaQuery.removeListener === 'function') {
            reducedMotionMediaQuery.removeListener(handleReducedMotionChange);
        }
    });
}

/**
 * Works 모달 시스템을 초기화한다.
 * - 중복 로직을 공통 컨트롤러로 묶어 확장 시 유지보수성을 높인다.
 */
function initProjectModals() {
    const modalControllers = [
        createModalController({
            openTriggerSelector: '.btn-internal-projects',
            modalSelector: '#modal-internal',
        }),
        createModalController({
            openTriggerSelector: '.btn-personal-projects',
            modalSelector: '#modal-personal',
        }),
    ].filter(Boolean);

    if (!modalControllers.length) {
        return;
    }

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') {
            return;
        }

        const activeModal = modalControllers.find((controller) => controller.isOpen());
        if (!activeModal) {
            return;
        }

        e.preventDefault();
        activeModal.close();
    });
}

/**
 * 개별 모달의 열기/닫기/포커스 복귀를 담당하는 컨트롤러를 생성한다.
 */
function createModalController({ openTriggerSelector, modalSelector }) {
    const openTriggers = document.querySelectorAll(openTriggerSelector);
    const modal = document.querySelector(modalSelector);

    if (!modal) {
        return null;
    }

    const closeTriggers = modal.querySelectorAll('.btn-close, .btn-close-modal');
    const primaryCloseButton = modal.querySelector('.btn-close');
    const MODAL_CLOSE_TRANSITION_FALLBACK_MS = 760;
    const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lastActiveTrigger = null;
    let closeTransitionTimer = null;
    let openAnimationFrameId = 0;

    const clearCloseTransitionTimer = () => {
        if (closeTransitionTimer) {
            clearTimeout(closeTransitionTimer);
            closeTransitionTimer = null;
        }
    };

    const clearOpenAnimationFrame = () => {
        if (openAnimationFrameId) {
            cancelAnimationFrame(openAnimationFrameId);
            openAnimationFrameId = 0;
        }
    };

    const syncBodyScrollLock = () => {
        const hasOpenModal = Boolean(document.querySelector('.modal-projects.is-active'));
        document.body.style.overflow = hasOpenModal ? 'hidden' : '';
    };

    const restoreTriggerFocus = () => {
        if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function' && document.contains(lastActiveTrigger)) {
            lastActiveTrigger.focus();
            return;
        }

        if (document.activeElement && modal.contains(document.activeElement) && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
    };

    const finalizeClose = () => {
        clearCloseTransitionTimer();
        clearOpenAnimationFrame();

        if (!modal.classList.contains('is-active')) {
            syncBodyScrollLock();
            return;
        }

        modal.classList.remove('is-active', 'is-visible', 'is-closing');
        modal.setAttribute('aria-hidden', 'true');
        syncBodyScrollLock();
        restoreTriggerFocus();
    };

    const open = (triggerElement) => {
        lastActiveTrigger = triggerElement || document.activeElement;

        if (modal.classList.contains('is-active') && modal.classList.contains('is-visible')) {
            if (primaryCloseButton) {
                primaryCloseButton.focus();
            }
            return;
        }

        clearCloseTransitionTimer();
        clearOpenAnimationFrame();

        modal.classList.add('is-active');
        modal.classList.remove('is-closing');
        modal.setAttribute('aria-hidden', 'false');
        syncBodyScrollLock();

        if (reducedMotionMediaQuery.matches) {
            modal.classList.add('is-visible');

            if (primaryCloseButton) {
                primaryCloseButton.focus();
            }
            return;
        }

        openAnimationFrameId = requestAnimationFrame(() => {
            openAnimationFrameId = requestAnimationFrame(() => {
                modal.classList.add('is-visible');

                if (primaryCloseButton) {
                    primaryCloseButton.focus();
                }
            });
        });
    };

    const close = () => {
        if (!modal.classList.contains('is-active')) {
            return;
        }

        clearCloseTransitionTimer();
        clearOpenAnimationFrame();

        if (document.activeElement && modal.contains(document.activeElement)) {
            restoreTriggerFocus();
        }

        modal.classList.remove('is-visible');
        modal.classList.add('is-closing');

        if (reducedMotionMediaQuery.matches) {
            finalizeClose();
            return;
        }

        closeTransitionTimer = window.setTimeout(() => {
            finalizeClose();
        }, MODAL_CLOSE_TRANSITION_FALLBACK_MS);
    };

    openTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            open(trigger);
        });
    });

    closeTriggers.forEach((trigger) => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            close();
        });
    });

    // 오버레이(빈 영역) 클릭 시 모달을 닫는다.
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            close();
        }
    });

    modal.addEventListener('transitionend', (e) => {
        if (e.target !== modal || e.propertyName !== 'opacity') {
            return;
        }

        if (!modal.classList.contains('is-active')) {
            return;
        }

        if (modal.classList.contains('is-visible')) {
            return;
        }

        finalizeClose();
    });

    if (modal.classList.contains('is-active')) {
        modal.classList.add('is-visible');
        modal.classList.remove('is-closing');
        modal.setAttribute('aria-hidden', 'false');
    } else {
        modal.classList.remove('is-visible', 'is-closing');
        modal.setAttribute('aria-hidden', 'true');
    }

    syncBodyScrollLock();

    return {
        close,
        isOpen: () => modal.classList.contains('is-active'),
    };
}
