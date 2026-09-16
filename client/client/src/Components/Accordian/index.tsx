
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { NavigationItem } from "../../Types/Accordian";

import "./index.css";

interface AccordianProps {
  options: NavigationItem[];
}

/* =========================================================
   Check whether an item contains the active route
   ========================================================= */

const containsActivePath = (
  item: NavigationItem,
  pathname: string
): boolean => {
  if (item.path === pathname) {
    return true;
  }

  return (
    item.children?.some((child) =>
      containsActivePath(child, pathname)
    ) ?? false
  );
};



/* =========================================================
   Find all parents of the active route
   ========================================================= */

const findActiveParents = (
  items: NavigationItem[],
  pathname: string,
  parents: string[] = []
): string[] => {
  for (const item of items) {
    // Current item is the active route
    if (item.path === pathname) {
      return parents;
    }

    // Search children recursively
    if (item.children?.length) {
      const result = findActiveParents(
        item.children,
        pathname,
        [...parents, item.id]
      );

      if (result.length > parents.length) {
        return result;
      }
    }
  }

  return [];
};


/* =========================================================
   Recursive Navigation Item
   ========================================================= */

interface NavigationItemProps {
  item: NavigationItem;
  level: number;

  expandedItems: Record<string, boolean>;

  setExpandedItems: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}

const NavigationItemComponent: React.FC<NavigationItemProps> = ({
  item,
  level,
  expandedItems,
  setExpandedItems,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const hasChildren = Boolean(item.children?.length);
  // console.log(location.pathname)

  const isActive = item.path && location.pathname.includes(item.path)

  const hasActiveChild =
    item.children?.some((child) =>
      containsActivePath(child, location.pathname)
    ) ?? false;

  const isExpanded = expandedItems[item.id] ?? false;


  /* =======================================================
     Handle click
     ======================================================= */

  const handleClick = () => {
    /*
     * Parent item
     *
     * Example:
     *
     * Orders >
     *
     * Clicking only expands/collapses it.
     */
    if (hasChildren) {
      setExpandedItems((previous) => ({
        ...previous,
        [item.id]: !previous[item.id],
      }));

      return;
    }

    /*
     * Leaf item
     *
     * Example:
     *
     * Active Orders
     *
     * Navigate to its route.
     */
    if (item.path) {
      navigate(item.path);
    }
  };


  return (
    <div className="navigation-item-wrapper">

      {/* Navigation Item */}

      <div
        className={[
          "navigation-item",

          isActive
            ? "navigation-item-active"
            : "",

          hasActiveChild
            ? "navigation-item-parent-active"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}

        style={{
          paddingLeft: `${12 + level * 16}px`,
        }}

        onClick={handleClick}
      >

        {/* Icon + Label */}

        <div className="navigation-item-content">

          {item.icon && (
            <span className="navigation-item-icon">
              {item.icon}
            </span>
          )}

          <span className="navigation-item-label">
            {item.label}
          </span>

        </div>


        {/* Expand / Collapse Arrow */}

        {hasChildren && (
          <span
            className={[
              "navigation-arrow",

              isExpanded
                ? "navigation-arrow-open"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            ›
          </span>
        )}

      </div>


      {/* ===================================================
          Children
         =================================================== */}

      {hasChildren && isExpanded && (
        <div className="navigation-children">

          {item.children!.map((child) => (
            <NavigationItemComponent
              key={child.id}

              item={child}

              level={level + 1}

              expandedItems={expandedItems}

              setExpandedItems={setExpandedItems}
            />
          ))}

        </div>
      )}

    </div>
  );
};


/* =========================================================
   Accordion
   ========================================================= */

const Accordian: React.FC<AccordianProps> = ({
  options,
}) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<
    Record<string, boolean>
  >({});


  /* =======================================================
     Automatically expand active route parents
     ======================================================= */

  useEffect(() => {
    const parents = findActiveParents(
      options,
      location.pathname
    );

    if (!parents.length) {
      return;
    }

    setExpandedItems((previous) => {
      const next = {
        ...previous,
      };

      parents.forEach((id) => {
        next[id] = true;
      });

      return next;
    });

  }, [location.pathname, options]);


  /* =======================================================
     Render
     ======================================================= */

  return (
    <nav className="sidebar-navigation">

      {options.map((item) => (
        <NavigationItemComponent
          key={item.id}

          item={item}

          level={0}

          expandedItems={expandedItems}

          setExpandedItems={setExpandedItems}
        />
      ))}

    </nav>
  );
};


export default Accordian;

