export const WEB_SVG = `<svg class="halloween-web" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M60 0 L0 60" stroke="currentColor" stroke-width="1" opacity="0.6"/>
  <path d="M60 15 L15 60" stroke="currentColor" stroke-width="1" opacity="0.5"/>
  <path d="M60 30 L30 60" stroke="currentColor" stroke-width="1" opacity="0.5"/>
  <path d="M60 45 L45 60" stroke="currentColor" stroke-width="1" opacity="0.4"/>
  <path d="M42 0 C 44 12, 44 12, 60 18" stroke="currentColor" stroke-width="1" fill="none" opacity="0.5"/>
  <path d="M24 0 C 30 24, 30 24, 60 36" stroke="currentColor" stroke-width="1" fill="none" opacity="0.5"/>
  <path d="M6 0 C 18 36, 18 36, 60 54" stroke="currentColor" stroke-width="1" fill="none" opacity="0.4"/>
</svg>`;

export const DROP_SPIDER_SVG = `<svg class="halloween-drop-spider" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19,11 L26,8 L31,10"/>
    <path d="M20,14 L28,13 L32,16"/>
    <path d="M20,17 L28,19 L31,23"/>
    <path d="M19,20 L25,25 L28,29"/>
    <path d="M13,11 L6,8 L1,10"/>
    <path d="M12,14 L4,13 L0,16"/>
    <path d="M12,17 L4,19 L1,23"/>
    <path d="M13,20 L7,25 L4,29"/>
  </g>
  <ellipse cx="16" cy="19" rx="7" ry="6.2" fill="currentColor"/>
  <circle cx="16" cy="10.5" r="4.2" fill="currentColor"/>
</svg>`;

// Organic amber cat-eyes on a shared 0 0 64 26 viewBox (unchanged from the
// old diamond version, so the public --halloween-eyes-width/-height
// defaults and every intensity preset that scales them stay valid without
// touching styles.ts). Each almond is a single cubic-bezier path — wider,
// rounder inner corner, sharper outer corner, the way a real feline eye
// tapers — rather than the old two-quadratic diamond. The right eye is not
// a mirror-perfect copy: its own bezier control points and a small
// rotate() on the group differ slightly from the left, for the "not
// machine-symmetric" look real eyes have. Both eyes stay vertically
// centered on the viewBox midline so halloween-blink's scaleY(), whose
// transform-origin is the SVG's default view-box transform box, still
// squashes each one toward its own center.
export const EYES_SVG = `<svg class="halloween-eyes-svg" viewBox="0 0 64 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g class="halloween-eye">
    <path d="M1 15C4 3 17 1 23 11C20 20 8 24 1 15Z" fill="#f2a441" stroke="rgba(18,10,3,0.5)" stroke-width="0.75"/>
    <path d="M11.5 6C13.2 6 13.4 9.5 12.5 13C13.4 16.5 13.2 20 11.5 20C9.8 20 9.6 16.5 10.5 13C9.6 9.5 9.8 6 11.5 6Z" fill="#0a0a0a"/>
    <ellipse cx="8.5" cy="8" rx="1.1" ry="1.6" fill="#fff8ec" opacity="0.85" transform="rotate(-25 8.5 8)"/>
  </g>
  <g class="halloween-eye" transform="rotate(3 52 13)">
    <path d="M63 15C60 3 47 1 41 11C44 20 56 24 63 15Z" fill="#f2a441" stroke="rgba(18,10,3,0.5)" stroke-width="0.75"/>
    <path d="M52.5 6C50.8 6 50.6 9.5 51.5 13C50.6 16.5 50.8 20 52.5 20C54.2 20 54.4 16.5 53.5 13C54.4 9.5 54.2 6 52.5 6Z" fill="#0a0a0a"/>
    <ellipse cx="55.5" cy="8.6" rx="1.1" ry="1.6" fill="#fff8ec" opacity="0.85" transform="rotate(25 55.5 8.6)"/>
  </g>
</svg>`;

// Rounded-arch grave marker with two engraved-look "RIP" text passes (a
// light offset layer under a dark one, one pixel apart — a cheap way to
// read as carved stone without a <filter>) and two thin currentColor crack
// strokes. Body/plinth stay a fixed pale stone tone, the same "not
// currentColor" precedent EYES_SVG already sets for a two-tone illustration
// (see the Color section of the README) — a mid-gray stone reads on both
// light and dark pages without depending on what --halloween-color happens
// to be. The outline and cracks DO read currentColor, so a color override
// still visibly reaches the tombstone. No gradient/filter/mask/clipPath
// ids anywhere — safe to render several of these in the DOM at once.
export const TOMBSTONE_SVG = `<svg class="halloween-tombstone-svg" viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="3" y="72" width="58" height="7" rx="2" fill="#8f8779"/>
  <path d="M7 76 L7 26 C7 10 17 3 32 3 C47 3 57 10 57 26 L57 76 Z" fill="#c9c2b8" stroke="currentColor" stroke-width="1.2" stroke-opacity="0.45"/>
  <path d="M19 30 L25 42 L21 53" stroke="currentColor" stroke-width="1" fill="none" opacity="0.22"/>
  <path d="M45 26 L41 36" stroke="currentColor" stroke-width="1" fill="none" opacity="0.22"/>
  <text x="32" y="45" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="19" fill="#efe8dc" opacity="0.55">RIP</text>
  <text x="32" y="44" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="19" fill="#4f473b" opacity="0.8">RIP</text>
</svg>`;

// Single-color silhouette (currentColor) — original artwork by the site
// owner (hat, flowing hair, heels, broom). Flies toward the upper-right by
// default (hair trails left, bristles trail lower-left); mirrored for
// right-to-left via .halloween-witch-item--rtl.
export const WITCH_SVG = `<svg class="halloween-witch-svg" viewBox="0 0 1122 1402" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<path fill="currentColor" fill-rule="evenodd" d="M 815 136 L 808 134 L 771 146 L 725 186 L 724 191 L 714 199 L 712 204 L 703 213 L 684 239 L 671 250 L 639 233 L 583 194 L 572 189 L 564 190 L 562 193 L 564 205 L 574 222 L 583 233 L 613 261 L 649 285 L 651 288 L 633 306 L 623 311 L 600 317 L 588 324 L 578 336 L 575 344 L 577 344 L 584 333 L 596 326 L 610 323 L 616 324 L 597 340 L 582 348 L 567 351 L 553 351 L 544 349 L 528 349 L 519 351 L 500 347 L 487 348 L 486 351 L 484 348 L 476 350 L 469 355 L 466 354 L 454 362 L 455 363 L 470 355 L 480 354 L 483 351 L 483 354 L 501 357 L 506 359 L 508 363 L 512 362 L 533 373 L 547 377 L 563 378 L 563 380 L 547 381 L 514 372 L 491 372 L 477 376 L 468 381 L 451 400 L 442 403 L 431 400 L 423 392 L 419 382 L 419 371 L 416 386 L 421 400 L 435 411 L 455 411 L 441 425 L 423 433 L 404 434 L 386 429 L 375 429 L 366 432 L 379 433 L 409 449 L 389 457 L 377 469 L 371 485 L 372 502 L 374 502 L 373 494 L 377 481 L 386 472 L 399 466 L 409 465 L 417 472 L 435 479 L 453 480 L 443 492 L 434 497 L 426 499 L 401 498 L 393 501 L 384 510 L 381 520 L 382 527 L 385 517 L 394 509 L 407 508 L 418 511 L 406 513 L 395 518 L 385 527 L 382 534 L 374 540 L 364 540 L 353 533 L 358 539 L 367 545 L 373 546 L 384 541 L 395 529 L 407 523 L 444 523 L 465 516 L 467 517 L 457 532 L 453 544 L 448 552 L 435 562 L 424 565 L 410 565 L 398 561 L 388 553 L 392 560 L 401 569 L 418 578 L 413 582 L 408 592 L 408 603 L 410 601 L 411 602 L 411 610 L 417 619 L 418 617 L 413 608 L 413 601 L 417 592 L 425 584 L 435 580 L 468 575 L 480 568 L 488 558 L 501 547 L 503 548 L 498 554 L 487 580 L 479 591 L 463 604 L 451 609 L 440 610 L 439 612 L 458 612 L 472 609 L 483 604 L 497 594 L 498 602 L 500 603 L 502 592 L 518 568 L 537 551 L 538 553 L 532 565 L 533 583 L 523 595 L 516 599 L 516 601 L 525 596 L 535 584 L 542 591 L 538 583 L 538 576 L 544 563 L 560 548 L 570 542 L 572 543 L 558 586 L 542 626 L 522 650 L 477 712 L 448 746 L 439 753 L 419 760 L 402 763 L 396 767 L 365 779 L 365 782 L 370 783 L 350 793 L 351 795 L 360 796 L 378 789 L 380 790 L 361 808 L 361 810 L 368 810 L 401 788 L 417 783 L 418 786 L 416 790 L 407 798 L 405 802 L 404 810 L 406 811 L 415 805 L 424 794 L 445 782 L 464 756 L 519 705 L 569 654 L 614 560 L 625 578 L 624 583 L 631 591 L 635 611 L 635 630 L 633 638 L 626 650 L 610 666 L 569 695 L 547 717 L 531 743 L 525 761 L 523 776 L 517 786 L 505 794 L 489 795 L 491 800 L 500 808 L 507 811 L 517 811 L 522 820 L 514 832 L 505 837 L 495 838 L 495 840 L 502 846 L 511 850 L 535 850 L 541 856 L 541 862 L 539 864 L 441 892 L 436 886 L 429 885 L 424 889 L 416 891 L 410 896 L 364 878 L 319 870 L 292 870 L 266 873 L 229 882 L 200 892 L 143 922 L 127 927 L 126 929 L 154 930 L 112 953 L 111 955 L 143 954 L 106 977 L 83 988 L 83 990 L 100 988 L 106 985 L 118 985 L 126 981 L 132 981 L 144 977 L 148 978 L 129 991 L 129 993 L 135 994 L 112 1009 L 95 1023 L 105 1021 L 118 1013 L 123 1013 L 136 1007 L 137 1008 L 133 1012 L 123 1018 L 119 1023 L 122 1024 L 149 1010 L 162 1006 L 165 1007 L 103 1047 L 69 1066 L 86 1066 L 116 1060 L 155 1044 L 156 1045 L 148 1052 L 143 1060 L 160 1062 L 146 1071 L 179 1067 L 215 1055 L 218 1056 L 201 1069 L 173 1086 L 171 1089 L 217 1080 L 257 1067 L 304 1044 L 347 1015 L 379 983 L 420 924 L 441 924 L 446 919 L 447 912 L 590 871 L 633 902 L 694 939 L 663 944 L 643 951 L 609 969 L 549 1007 L 522 1020 L 515 1022 L 501 1021 L 494 1013 L 485 1008 L 473 1007 L 466 1010 L 442 1027 L 404 1044 L 405 1048 L 408 1048 L 450 1033 L 458 1033 L 460 1035 L 459 1041 L 452 1053 L 440 1065 L 422 1077 L 417 1084 L 417 1096 L 422 1117 L 428 1132 L 433 1136 L 438 1130 L 442 1105 L 451 1096 L 480 1082 L 521 1053 L 544 1041 L 589 1026 L 618 1019 L 621 1020 L 566 1095 L 542 1121 L 526 1130 L 521 1130 L 509 1125 L 497 1126 L 491 1129 L 486 1134 L 465 1167 L 440 1192 L 440 1194 L 444 1196 L 477 1166 L 486 1161 L 491 1163 L 492 1172 L 489 1183 L 480 1202 L 469 1218 L 469 1226 L 488 1253 L 497 1262 L 505 1266 L 508 1264 L 509 1260 L 502 1237 L 503 1225 L 531 1192 L 556 1151 L 582 1123 L 610 1100 L 682 1048 L 762 987 L 819 956 L 831 948 L 841 937 L 845 926 L 845 918 L 839 902 L 808 863 L 779 835 L 763 822 L 765 820 L 864 793 L 872 800 L 876 800 L 878 798 L 883 799 L 890 796 L 894 791 L 899 794 L 903 790 L 907 781 L 1056 739 L 1065 733 L 1066 726 L 1063 720 L 1060 718 L 1054 718 L 904 761 L 883 756 L 856 763 L 850 763 L 834 749 L 820 732 L 765 652 L 761 620 L 758 612 L 758 601 L 763 592 L 775 587 L 784 579 L 790 570 L 795 554 L 794 540 L 788 530 L 762 508 L 760 483 L 754 467 L 744 459 L 719 454 L 709 450 L 705 446 L 704 439 L 711 421 L 719 414 L 741 422 L 748 422 L 753 418 L 755 407 L 762 403 L 762 398 L 767 393 L 766 387 L 777 381 L 777 376 L 771 363 L 771 354 L 779 351 L 833 371 L 855 377 L 884 382 L 898 382 L 902 380 L 902 377 L 896 371 L 882 361 L 781 310 L 777 296 L 779 229 L 783 221 L 784 196 L 786 184 L 790 174 L 806 158 L 808 161 L 819 166 L 816 176 L 832 194 L 835 192 L 829 166 L 828 149 Z M 190 1038 L 162 1054 L 155 1054 L 188 1037 Z M 726 652 L 728 655 L 731 669 L 744 688 L 758 704 L 827 771 L 832 777 L 832 780 L 740 806 L 730 799 L 731 796 L 729 794 L 703 783 L 682 770 L 676 758 L 677 748 L 689 731 L 689 721 L 699 693 L 712 670 Z M 510 503 L 491 514 L 479 525 L 478 524 L 490 511 L 496 507 L 507 502 Z M 464 463 L 450 471 L 440 474 L 426 473 L 412 465 L 448 465 L 460 462 Z M 504 396 L 484 398 L 473 401 L 461 407 L 458 406 L 466 398 L 476 393 L 491 392 Z M 530 354 L 549 353 L 573 358 L 568 360 L 554 361 L 540 358 Z"/>
</svg>`;
