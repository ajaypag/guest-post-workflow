Modal Code 

<?php
/**
 * Description of LSO_FrontendModel
 *
 * @author linkio.com
 */
class LSO_FrontendModel {

    function __construct() {
        global $wpdb;
        $this->db_connect = $wpdb;
        $this->items_table = LSO_TABLE_ITEMS;
        $this->category_table = LSO_TABLE_CATEGORIES;
        $this->link_type_table = LSO_TABLE_LINK_TYPE;
        $this->csv_subscribes_table = LSO_TABLE_CSV_SUBSCRIBES;
    }

    function get_all_categories_with_parent($link_types = []) {
        $whrCond = null;
        if(is_array($link_types) && count($link_types) > 0) {
            $cond = implode(",", $link_types);
            $whrCond = " AND link_type.id IN ($cond) ";
        }
        $cat_titles = $this->db_connect->get_results("SELECT id, name FROM `$this->category_table` WHERE status = '1' ORDER BY `id` ASC", ARRAY_A);
        $qry = "SELECT "
                . "link_type.id AS id, link_type.name, link_type.category_id, COUNT(item.id) AS total  "
                . "FROM `$this->link_type_table` `link_type` "
                . "LEFT JOIN `$this->items_table` `item` ON (item.link_type_id = link_type.id AND item.status = '1') "
                . "WHERE link_type.status = '1' $whrCond "
                . "GROUP BY link_type.id "
                . "ORDER BY link_type.id ASC";
        $categories = $this->db_connect->get_results($qry, ARRAY_A);

        $cat = [];
        $show_cat = (count($cat_titles) > 0) ? (count($categories) > 1) ? true : false : false;
        foreach ($cat_titles as $key => $title){
            $cat[$key] = $title;
            foreach ($categories as $category) {
                if($category['category_id'] == $title['id']) {
                    if(!array_key_exists('childs', $cat[$key])) {
                        $cat[$key]['childs'] = [];
                    }
                    array_push($cat[$key]['childs'], $category);
                }
            }
            if(!array_key_exists('childs', $cat[$key]) || count($cat[$key]['childs']) == 0) {
                unset($cat[$key]);
            }
        }
        return ['categories' => $cat, 'show_cat' => $show_cat];
    }

    function get_all_active_items($link_types = [], $limit = null, $offset = null) {
        $qry = "SELECT "
            . "`item`.`operator`,`item`.`keyword_string`, `item`.`seo_tool`, link_type.id as link_type_id, item.id AS item_id "
            . "FROM `$this->items_table` AS `item` "
            . "JOIN `$this->link_type_table` AS `link_type` ON `item`.`link_type_id` = `link_type`.`id` AND `link_type`.`status` = '1' "
            . "WHERE `item`.`status` = '1' "
            ;
        if(is_array($link_types) && count($link_types) > 0) {
            $cond = implode(",", $link_types);
            $qry .= " AND `link_type`.`id` IN ($cond) ";
        }
        
        $data = $this->db_connect->get_results($qry, ARRAY_A);
        $qry2 = "SELECT "
            . "category.name AS category_name, link_type.name as link_type_name, link_type.id as link_type_id "
            . "FROM `$this->category_table` AS `category` "
            . "JOIN `$this->link_type_table` AS `link_type` ON `category`.`id` = `link_type`.`category_id` "
            . "WHERE 1=1 "
            ;
        if(isset($cond)) {
            $qry2 .= " AND `link_type`.`id` IN ($cond) ";
        }
        $qry2 .= " ORDER BY `link_type`.`id` ASC LIMIT " .$limit;

        if($offset) {
            $qry2 .= " OFFSET $offset";
        }
        
        $category = $this->db_connect->get_results($qry2, ARRAY_A);
        $arranged_data = [];
        foreach($category as $cat) {
            foreach ($data as $link_type) {
                if($link_type['link_type_id'] == $cat['link_type_id']) {
                    $arranged_data[$cat['link_type_id']]['category_name'] = $cat['category_name'];
                    $arranged_data[$cat['link_type_id']]['link_type_name'] = $cat['link_type_name'];
                    $arranged_data[$cat['link_type_id']]['data'][] = [
                        'id' => $link_type['item_id'], 
                        'operator' => $link_type['operator'], 
                        'keyword_string' => $link_type['keyword_string'], 
                        'seo_tool' => $link_type['seo_tool']
                    ];

                }
            }
        }

        return array_values($arranged_data);
    }

    function get_active_item_count($link_types = []) {
        $qry = "SELECT COUNT(`item`.`id`) as total "
                . "FROM `$this->items_table` `item` "
                . "JOIN `$this->link_type_table` `link_type` ON `item`.`link_type_id` = `link_type`.`id` AND `link_type`.`status` = '1' "
                . "WHERE `item`.`status` = '1'"
                ;
        if(is_array($link_types) && count($link_types) > 0) {
            $cond = implode(",", $link_types);
            $qry .= " AND `link_type`.`id` IN ($cond) ";
        }
        return $this->db_connect->get_row($qry);
    }
    
    function get_active_link_type_count($link_types = []) {
        $qry = "SELECT COUNT(id) as total "
            . "FROM `$this->link_type_table` "
            . "WHERE status = '1' "
            ;
        if(is_array($link_types) && count($link_types) > 0) {
            $cond = implode(",", $link_types);
            $qry .= " AND id IN ($cond) ";
        }
        return $this->db_connect->get_row($qry);
    }

}




Controller Code 

<?php
/**
 * Description of LSO_Frontend
 *
 * @author linkio.com
 */
class LSO_Frontend {

    public $page;
    public $hasLayout;
    public $data;
    public $model;
    public $limit;
    public $keywords;
    public $options;

    public function __construct() {
        $this->page = '';
        $this->hasLayout = TRUE;
        $this->data = [];
        $this->model = array();
        $this->cat_attrs = '';
        $this->keywords = '';

    }

    public function do_action($action = 'index', $cat_attrs = null, $limit = null, $keywords = null, $options = null) {
        $this->cat_attrs = $cat_attrs;
        $this->limit = $limit ?: LSO_TEMPLATE_LIMIT;
        $this->keywords = $keywords ? preg_replace('/\,\s/', ',', trim($keywords)) : null;
        $this->options = $options ? array_map('trim', explode(',', $options)): [];


        /////// load model////////
        $model_file = 'LSO_FrontendModel';
        $lso_expt_mdl_file = LSO_PLUGIN_FRONT_DIR . '/models/' . $model_file . '.php';
        if (file_exists($lso_expt_mdl_file)) {    
            require_once $lso_expt_mdl_file;
            $this->model = new $model_file();
        }

        $this->$action();
        if ($this->hasLayout) {
            $this->render_page_data();
        }
    }

    private function render_page_data() {
        if ($this->page != '') {
            $view = LSO_PLUGIN_FRONT_DIR . '/views/' . $this->page . '.php';

            if (file_exists($view)) {
                if (isset($this->data)) {
                    if ($this->data != NULL) {
                        extract($this->data);
                    }
                }
                require_once $view;
            } else {
                echo ' 404 not found. ' . $view;
            }
        }
    }
}